import type { GoogleCalendarConnection, TicketCalendarSync, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createGoogleCalendarClient } from "./client";
import { isTicketEligibleForPersonalSync, mapTicketToGoogleEvent } from "./event-mapper";
import { getGoogleOAuthConfig, refreshAccessToken } from "./oauth";
import {
  buildTicketFailure,
  formatSyncStatusLabel,
  hasCalendarWriteScope,
  missingCalendarScopeMessage,
  resolveSyncResultStatus,
  serializeSyncFailures,
  type SyncResultStatus,
  type SyncTicketFailure,
} from "./sync-errors";
import { decryptSecret, encryptSecret } from "./tokens";
import { GoogleCalendarApiError, type GoogleCalendarApi, type SyncableTicket, type SyncSummary } from "./types";

export type ConnectionWithTokens = GoogleCalendarConnection;

export type SyncDeps = {
  loadConnection: (userId: string) => Promise<GoogleCalendarConnection | null>;
  loadEligibleTickets: (
    userId: string,
    workspaceId: string | null,
  ) => Promise<SyncableTicket[]>;
  loadActiveSyncs: (userId: string) => Promise<TicketCalendarSync[]>;
  upsertSyncRow: (data: {
    userId: string;
    ticketId: string;
    calendarConnectionId: string;
    googleCalendarId: string;
    googleEventId: string;
    lastSyncedDueDate: string;
    lastSyncedHash: string;
    status: "SYNCED" | "ERROR" | "DELETED";
    lastError?: string | null;
  }) => Promise<void>;
  markSyncDeleted: (id: string) => Promise<void>;
  markSyncError: (id: string, error: string) => Promise<void>;
  updateConnectionTokens: (
    id: string,
    data: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted?: string | null;
      tokenExpiry?: Date | null;
      scope?: string | null;
    },
  ) => Promise<void>;
  updateConnectionSyncMeta: (
    id: string,
    data: {
      lastSyncAt: Date;
      lastSyncStatus: string;
      lastSyncError: string | null;
      status?: "CONNECTED" | "ERROR";
    },
  ) => Promise<void>;
  api: GoogleCalendarApi;
  refreshTokens?: (
    refreshToken: string,
  ) => Promise<{ access_token: string; expires_in?: number; scope?: string; refresh_token?: string }>;
  appUrl?: string;
  now?: () => Date;
};

const REFRESH_SKEW_MS = 60_000;

export type SyncUserGoogleCalendarResult = SyncSummary & {
  ok: boolean;
  status: SyncResultStatus;
  error?: string;
  failures: SyncTicketFailure[];
  reconnectRequired?: boolean;
};

export async function ensureAccessToken(
  connection: GoogleCalendarConnection,
  deps: Pick<SyncDeps, "refreshTokens" | "updateConnectionTokens" | "now">,
): Promise<string> {
  const now = deps.now ?? (() => new Date());
  const access = decryptSecret(connection.accessTokenEncrypted);
  const expiry = connection.tokenExpiry?.getTime() ?? 0;
  if (expiry > now().getTime() + REFRESH_SKEW_MS) {
    return access;
  }

  if (!connection.refreshTokenEncrypted) {
    throw new Error("Google Calendar connection needs to be reconnected.");
  }

  const refresh = decryptSecret(connection.refreshTokenEncrypted);
  const refreshFn =
    deps.refreshTokens ??
    (async (token: string) => {
      const cfg = getGoogleOAuthConfig();
      if (!cfg) throw new Error("Google Calendar is not configured.");
      return refreshAccessToken(token, cfg);
    });

  const tokens = await refreshFn(refresh);
  const tokenExpiry =
    typeof tokens.expires_in === "number"
      ? new Date(now().getTime() + tokens.expires_in * 1000)
      : null;

  await deps.updateConnectionTokens(connection.id, {
    accessTokenEncrypted: encryptSecret(tokens.access_token),
    refreshTokenEncrypted: tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : undefined,
    tokenExpiry,
    scope: tokens.scope ?? undefined,
  });

  return tokens.access_token;
}

function emptySummary(): SyncSummary {
  return { created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 };
}

function ticketKey(ticket: SyncableTicket): string {
  return `${ticket.project.key}-${ticket.number}`;
}

function hasMappedGoogleEvent(sync: TicketCalendarSync | undefined): sync is TicketCalendarSync {
  return Boolean(sync?.googleEventId?.trim());
}

async function recordTicketFailure(
  resolved: SyncDeps,
  params: {
    user: Pick<User, "id">;
    ticket: SyncableTicket;
    connection: GoogleCalendarConnection;
    calendarId: string;
    operation: SyncTicketFailure["operation"];
    err: unknown;
    existing?: TicketCalendarSync;
    dueDateOnly?: string;
    contentHash?: string;
  },
): Promise<SyncTicketFailure> {
  const failure = buildTicketFailure({
    ticketId: params.ticket.id,
    ticketKey: ticketKey(params.ticket),
    title: params.ticket.title,
    operation: params.operation,
    err: params.err,
  });

  await resolved.upsertSyncRow({
    userId: params.user.id,
    ticketId: params.ticket.id,
    calendarConnectionId: params.connection.id,
    googleCalendarId: params.calendarId,
    googleEventId: params.existing?.googleEventId?.trim() || "",
    lastSyncedDueDate: params.dueDateOnly ?? params.existing?.lastSyncedDueDate ?? "",
    lastSyncedHash: params.contentHash ?? params.existing?.lastSyncedHash ?? "",
    status: "ERROR",
    lastError: failure.message,
  });

  return failure;
}

export async function syncUserGoogleCalendar(
  user: Pick<User, "id" | "workspaceId">,
  deps?: Partial<SyncDeps>,
): Promise<SyncUserGoogleCalendarResult> {
  const resolved = resolveDeps(deps);
  const connection = await resolved.loadConnection(user.id);
  const failures: SyncTicketFailure[] = [];

  if (!connection || (connection.status !== "CONNECTED" && connection.status !== "ERROR")) {
    return {
      ...emptySummary(),
      ok: false,
      status: "ERROR",
      error: "Google Calendar is not connected.",
      failures,
    };
  }

  if (!hasCalendarWriteScope(connection.scope)) {
    const message = missingCalendarScopeMessage();
    await resolved.updateConnectionSyncMeta(connection.id, {
      lastSyncAt: new Date(),
      lastSyncStatus: "ERROR: 0 created, 0 updated, 0 deleted, 0 skipped, 0 errors",
      lastSyncError: message,
      status: "ERROR",
    });
    return {
      ...emptySummary(),
      ok: false,
      status: "ERROR",
      error: message,
      failures,
      reconnectRequired: true,
    };
  }

  let accessToken: string;
  try {
    accessToken = await ensureAccessToken(connection, resolved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token refresh failed.";
    await resolved.updateConnectionSyncMeta(connection.id, {
      lastSyncAt: new Date(),
      lastSyncStatus: "ERROR: 0 created, 0 updated, 0 deleted, 0 skipped, 0 errors",
      lastSyncError: message,
      status: "ERROR",
    });
    return {
      ...emptySummary(),
      ok: false,
      status: "ERROR",
      error: message,
      failures,
      reconnectRequired: true,
    };
  }

  const fresh = (await resolved.loadConnection(user.id)) ?? connection;
  if (!hasCalendarWriteScope(fresh.scope)) {
    const message = missingCalendarScopeMessage();
    await resolved.updateConnectionSyncMeta(fresh.id, {
      lastSyncAt: new Date(),
      lastSyncStatus: "ERROR: 0 created, 0 updated, 0 deleted, 0 skipped, 0 errors",
      lastSyncError: message,
      status: "ERROR",
    });
    return {
      ...emptySummary(),
      ok: false,
      status: "ERROR",
      error: message,
      failures,
      reconnectRequired: true,
    };
  }

  const calendarId = fresh.calendarId || "primary";
  const summary = emptySummary();
  const eligible = await resolved.loadEligibleTickets(user.id, user.workspaceId);
  const existingSyncs = await resolved.loadActiveSyncs(user.id);
  const syncByTicketId = new Map(
    existingSyncs.filter((s) => s.status !== "DELETED").map((s) => [s.ticketId, s]),
  );
  const eligibleIds = new Set(eligible.map((t) => t.id));

  for (const ticket of eligible) {
    if (!isTicketEligibleForPersonalSync(ticket, user.id)) {
      summary.skipped += 1;
      continue;
    }

    const existing = syncByTicketId.get(ticket.id);
    let mapped: ReturnType<typeof mapTicketToGoogleEvent>;
    try {
      mapped = mapTicketToGoogleEvent(ticket, { appUrl: resolved.appUrl });
    } catch (err) {
      summary.errors += 1;
      failures.push(
        await recordTicketFailure(resolved, {
          user,
          ticket,
          connection: fresh,
          calendarId,
          operation: hasMappedGoogleEvent(existing) ? "update" : "create",
          err,
          existing,
        }),
      );
      continue;
    }

    const { event, dueDateOnly, contentHash } = mapped;

    if (
      hasMappedGoogleEvent(existing) &&
      existing.lastSyncedHash === contentHash &&
      existing.status === "SYNCED"
    ) {
      summary.skipped += 1;
      continue;
    }

    try {
      if (!hasMappedGoogleEvent(existing) || existing.status === "ERROR") {
        const created = await resolved.api.createEvent(calendarId, event, accessToken);
        await resolved.upsertSyncRow({
          userId: user.id,
          ticketId: ticket.id,
          calendarConnectionId: fresh.id,
          googleCalendarId: calendarId,
          googleEventId: created.id,
          lastSyncedDueDate: dueDateOnly,
          lastSyncedHash: contentHash,
          status: "SYNCED",
          lastError: null,
        });
        summary.created += 1;
        continue;
      }

      try {
        await resolved.api.updateEvent(calendarId, existing.googleEventId, event, accessToken);
        await resolved.upsertSyncRow({
          userId: user.id,
          ticketId: ticket.id,
          calendarConnectionId: fresh.id,
          googleCalendarId: calendarId,
          googleEventId: existing.googleEventId,
          lastSyncedDueDate: dueDateOnly,
          lastSyncedHash: contentHash,
          status: "SYNCED",
          lastError: null,
        });
        summary.updated += 1;
      } catch (err) {
        if (
          err instanceof GoogleCalendarApiError &&
          (err.status === 404 || err.status === 410)
        ) {
          const created = await resolved.api.createEvent(calendarId, event, accessToken);
          await resolved.upsertSyncRow({
            userId: user.id,
            ticketId: ticket.id,
            calendarConnectionId: fresh.id,
            googleCalendarId: calendarId,
            googleEventId: created.id,
            lastSyncedDueDate: dueDateOnly,
            lastSyncedHash: contentHash,
            status: "SYNCED",
            lastError: null,
          });
          summary.created += 1;
          continue;
        }
        throw err;
      }
    } catch (err) {
      summary.errors += 1;
      failures.push(
        await recordTicketFailure(resolved, {
          user,
          ticket,
          connection: fresh,
          calendarId,
          operation: hasMappedGoogleEvent(existing) ? "update" : "create",
          err,
          existing,
          dueDateOnly,
          contentHash,
        }),
      );
    }
  }

  for (const sync of existingSyncs) {
    if (sync.status === "DELETED") continue;
    if (eligibleIds.has(sync.ticketId)) continue;

    try {
      if (sync.googleEventId?.trim()) {
        await resolved.api.deleteEvent(calendarId, sync.googleEventId, accessToken);
      }
      await resolved.markSyncDeleted(sync.id);
      summary.deleted += 1;
    } catch (err) {
      summary.errors += 1;
      const message =
        err instanceof GoogleCalendarApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Delete failed.";
      await resolved.markSyncError(sync.id, message);
      failures.push(
        buildTicketFailure({
          ticketId: sync.ticketId,
          ticketKey: sync.ticketId,
          title: "Removed ticket",
          operation: "delete",
          err,
        }),
      );
    }
  }

  const status = resolveSyncResultStatus(summary, false);
  const reconnectRequired = failures.some(
    (failure) => failure.category === "oauth_scope" || failure.category === "token_refresh",
  );

  await resolved.updateConnectionSyncMeta(fresh.id, {
    lastSyncAt: new Date(),
    lastSyncStatus: formatSyncStatusLabel(status, summary),
    lastSyncError: serializeSyncFailures(failures),
    status: reconnectRequired ? "ERROR" : "CONNECTED",
  });

  return {
    ...summary,
    ok: status !== "ERROR",
    status,
    failures,
    ...(reconnectRequired ? { reconnectRequired: true } : {}),
  };
}

function resolveDeps(partial?: Partial<SyncDeps>): SyncDeps {
  const api = partial?.api ?? createGoogleCalendarClient();
  return {
    api,
    appUrl: partial?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    now: partial?.now,
    refreshTokens: partial?.refreshTokens,
    loadConnection:
      partial?.loadConnection ??
      ((userId) =>
        prisma.googleCalendarConnection.findUnique({ where: { userId } })),
    loadEligibleTickets:
      partial?.loadEligibleTickets ??
      ((userId, workspaceId) =>
        prisma.ticket.findMany({
          where: {
            assigneeId: userId,
            dueDate: { not: null },
            isArchived: false,
            status: { notIn: ["DONE", "ARCHIVED"] },
            project: { workspaceId: workspaceId ?? undefined },
          },
          include: {
            project: { select: { key: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } },
          },
        }) as Promise<SyncableTicket[]>),
    loadActiveSyncs:
      partial?.loadActiveSyncs ??
      ((userId) =>
        prisma.ticketCalendarSync.findMany({
          where: { userId, status: { not: "DELETED" } },
        })),
    upsertSyncRow:
      partial?.upsertSyncRow ??
      (async (data) => {
        await prisma.ticketCalendarSync.upsert({
          where: {
            userId_ticketId: { userId: data.userId, ticketId: data.ticketId },
          },
          create: {
            userId: data.userId,
            ticketId: data.ticketId,
            calendarConnectionId: data.calendarConnectionId,
            googleCalendarId: data.googleCalendarId,
            googleEventId: data.googleEventId,
            lastSyncedDueDate: data.lastSyncedDueDate,
            lastSyncedHash: data.lastSyncedHash,
            status: data.status,
            lastError: data.lastError ?? null,
          },
          update: {
            calendarConnectionId: data.calendarConnectionId,
            googleCalendarId: data.googleCalendarId,
            googleEventId: data.googleEventId,
            lastSyncedDueDate: data.lastSyncedDueDate,
            lastSyncedHash: data.lastSyncedHash,
            status: data.status,
            lastError: data.lastError ?? null,
          },
        });
      }),
    markSyncDeleted:
      partial?.markSyncDeleted ??
      (async (id) => {
        await prisma.ticketCalendarSync.update({
          where: { id },
          data: { status: "DELETED", lastError: null },
        });
      }),
    markSyncError:
      partial?.markSyncError ??
      (async (id, error) => {
        await prisma.ticketCalendarSync.update({
          where: { id },
          data: { status: "ERROR", lastError: error },
        });
      }),
    updateConnectionTokens:
      partial?.updateConnectionTokens ??
      (async (id, data) => {
        await prisma.googleCalendarConnection.update({
          where: { id },
          data: {
            accessTokenEncrypted: data.accessTokenEncrypted,
            ...(data.refreshTokenEncrypted !== undefined
              ? { refreshTokenEncrypted: data.refreshTokenEncrypted }
              : {}),
            ...(data.tokenExpiry !== undefined ? { tokenExpiry: data.tokenExpiry } : {}),
            ...(data.scope !== undefined ? { scope: data.scope } : {}),
          },
        });
      }),
    updateConnectionSyncMeta:
      partial?.updateConnectionSyncMeta ??
      (async (id, data) => {
        await prisma.googleCalendarConnection.update({
          where: { id },
          data: {
            lastSyncAt: data.lastSyncAt,
            lastSyncStatus: data.lastSyncStatus,
            lastSyncError: data.lastSyncError,
            ...(data.status ? { status: data.status } : {}),
          },
        });
      }),
  };
}
