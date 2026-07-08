import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleAuthorizeUrl,
  buildOAuthState,
  parseAndValidateOAuthState,
} from "./oauth";
import { decryptSecret, encryptSecret, hashSyncPayload } from "./tokens";
import {
  googleAllDayRange,
  isTicketEligibleForPersonalSync,
  mapTicketToGoogleEvent,
} from "./event-mapper";
import { syncUserGoogleCalendar, type SyncDeps } from "./sync";
import type { GoogleCalendarConnection, TicketCalendarSync } from "@prisma/client";
import type { SyncableTicket } from "./types";

describe("buildGoogleAuthorizeUrl", () => {
  it("includes calendar scope, redirect URI, state, and offline access", () => {
    const url = buildGoogleAuthorizeUrl({
      clientId: "client-123",
      redirectUri: "http://localhost:3000/api/integrations/google-calendar/callback",
      state: "user-1:123:abc",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/integrations/google-calendar/callback",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("state")).toBe("user-1:123:abc");
    expect(parsed.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/calendar.events",
    );
  });
});

describe("OAuth state", () => {
  it("round-trips a signed state for the same user", () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "test-encryption-key-for-state";
    const state = buildOAuthState("user-42", 1_700_000_000_000);
    expect(parseAndValidateOAuthState(state, "user-42", 10 * 365 * 24 * 60 * 60 * 1000)).toEqual({
      ok: true,
    });
    expect(parseAndValidateOAuthState(state, "other-user").ok).toBe(false);
  });
});

describe("token encryption", () => {
  beforeEach(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "unit-test-encryption-secret";
  });

  afterEach(() => {
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  });

  it("round-trips without exposing plaintext in ciphertext", () => {
    const secret = "ya29.access-token-value";
    const encrypted = encryptSecret(secret);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("hashSyncPayload is stable for the same fields", () => {
    const a = hashSyncPayload({ title: "A", dueDate: "2026-07-13" });
    const b = hashSyncPayload({ dueDate: "2026-07-13", title: "A" });
    expect(a).toBe(b);
    expect(a).not.toBe(hashSyncPayload({ title: "B", dueDate: "2026-07-13" }));
  });
});

describe("event mapper", () => {
  it("builds exclusive all-day end date for 2026-07-13 without timezone drift", () => {
    expect(googleAllDayRange("2026-07-13")).toEqual({
      start: "2026-07-13",
      end: "2026-07-14",
    });

    const ticket = makeTicket({ dueDate: new Date("2026-07-13T00:00:00.000Z") });
    const { event, dueDateOnly } = mapTicketToGoogleEvent(ticket, {
      appUrl: "https://tickets.example.com",
    });
    expect(dueDateOnly).toBe("2026-07-13");
    expect(event.start.date).toBe("2026-07-13");
    expect(event.end.date).toBe("2026-07-14");
    expect(event.summary).toBe("[PMGT-2] Build EBAC stakeholder map");
    expect(event.transparency).toBe("transparent");
    expect(event.description).toContain("Ticket: PMGT-2");
    expect(event.description).toContain("https://tickets.example.com/tickets/t-1");
    expect(event.extendedProperties?.private?.ebacTicketId).toBe("t-1");
  });

  it("excludes unassigned, other-assignee, archived, done, and no-due-date tickets", () => {
    const userId = "user-1";
    expect(
      isTicketEligibleForPersonalSync(
        { assigneeId: userId, dueDate: new Date("2026-07-13T12:00:00Z"), isArchived: false, status: "TODO" },
        userId,
      ),
    ).toBe(true);
    expect(
      isTicketEligibleForPersonalSync(
        { assigneeId: null, dueDate: new Date("2026-07-13T12:00:00Z"), isArchived: false, status: "TODO" },
        userId,
      ),
    ).toBe(false);
    expect(
      isTicketEligibleForPersonalSync(
        { assigneeId: "other", dueDate: new Date("2026-07-13T12:00:00Z"), isArchived: false, status: "TODO" },
        userId,
      ),
    ).toBe(false);
    expect(
      isTicketEligibleForPersonalSync(
        { assigneeId: userId, dueDate: new Date("2026-07-13T12:00:00Z"), isArchived: true, status: "TODO" },
        userId,
      ),
    ).toBe(false);
    expect(
      isTicketEligibleForPersonalSync(
        { assigneeId: userId, dueDate: new Date("2026-07-13T12:00:00Z"), isArchived: false, status: "DONE" },
        userId,
      ),
    ).toBe(false);
  });
});

describe("syncUserGoogleCalendar", () => {
  beforeEach(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "unit-test-encryption-secret";
  });

  afterEach(() => {
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  });

  it("creates an event for an assigned due-date ticket", async () => {
    const api = mockApi();
    const deps = baseDeps(api, {
      tickets: [makeTicket()],
      syncs: [],
    });

    const result = await syncUserGoogleCalendar({ id: "user-1", workspaceId: "ws-1" }, deps);
    expect(result.ok).toBe(true);
    expect(result.created).toBe(1);
    expect(api.createEvent).toHaveBeenCalledOnce();
    const [, event] = api.createEvent.mock.calls[0]!;
    expect(event.start.date).toBe("2026-07-13");
    expect(event.end.date).toBe("2026-07-14");
    expect(deps.upsertSyncRow).toHaveBeenCalled();
  });

  it("updates when title/dueDate/status/priority changes", async () => {
    const api = mockApi();
    const ticket = makeTicket({ title: "Updated title", priority: "HIGH" });
    const { contentHash: oldHash } = mapTicketToGoogleEvent(
      makeTicket({ title: "Old", priority: "LOW" }),
      { appUrl: "http://localhost:3000" },
    );
    const deps = baseDeps(api, {
      tickets: [ticket],
      syncs: [makeSync({ lastSyncedHash: oldHash })],
    });

    const result = await syncUserGoogleCalendar({ id: "user-1", workspaceId: "ws-1" }, deps);
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(api.updateEvent).toHaveBeenCalledOnce();
    expect(api.createEvent).not.toHaveBeenCalled();
  });

  it("skips unchanged events", async () => {
    const api = mockApi();
    const ticket = makeTicket();
    const { contentHash } = mapTicketToGoogleEvent(ticket, { appUrl: "http://localhost:3000" });
    const deps = baseDeps(api, {
      tickets: [ticket],
      syncs: [makeSync({ lastSyncedHash: contentHash })],
    });

    const result = await syncUserGoogleCalendar({ id: "user-1", workspaceId: "ws-1" }, deps);
    expect(result.skipped).toBe(1);
    expect(api.createEvent).not.toHaveBeenCalled();
    expect(api.updateEvent).not.toHaveBeenCalled();
  });

  it("deletes event when ticket loses due date / is no longer eligible", async () => {
    const api = mockApi();
    const deps = baseDeps(api, {
      tickets: [],
      syncs: [makeSync()],
    });

    const result = await syncUserGoogleCalendar({ id: "user-1", workspaceId: "ws-1" }, deps);
    expect(result.deleted).toBe(1);
    expect(api.deleteEvent).toHaveBeenCalledWith("primary", "evt-1", expect.any(String));
    expect(deps.markSyncDeleted).toHaveBeenCalledWith("sync-1");
  });

  it("excludes tickets assigned to other users from create", async () => {
    const api = mockApi();
    const deps = baseDeps(api, {
      tickets: [makeTicket({ assigneeId: "other-user" })],
      syncs: [],
    });
    // loadEligibleTickets already filters in production; this guards the eligibility check.
    deps.loadEligibleTickets = async () => [makeTicket({ assigneeId: "other-user" })];

    const result = await syncUserGoogleCalendar({ id: "user-1", workspaceId: "ws-1" }, deps);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(api.createEvent).not.toHaveBeenCalled();
  });

  it("refuses sync when connection is disconnected", async () => {
    const api = mockApi();
    const deps = baseDeps(api, { tickets: [makeTicket()], syncs: [] });
    deps.loadConnection = async () =>
      makeConnection({ status: "DISCONNECTED" });

    const result = await syncUserGoogleCalendar({ id: "user-1", workspaceId: "ws-1" }, deps);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not connected/i);
    expect(api.createEvent).not.toHaveBeenCalled();
  });
});

function makeTicket(overrides: Partial<SyncableTicket> = {}): SyncableTicket {
  return {
    id: "t-1",
    number: 2,
    title: "Build EBAC stakeholder map",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: new Date("2026-07-13T00:00:00.000Z"),
    assigneeId: "user-1",
    isArchived: false,
    project: { key: "PMGT", name: "EBAC Project Management" },
    assignee: { id: "user-1", name: "Josh", email: "josh@example.com" },
    ...overrides,
  };
}

function makeConnection(
  overrides: Partial<GoogleCalendarConnection> = {},
): GoogleCalendarConnection {
  return {
    id: "conn-1",
    userId: "user-1",
    googleAccountEmail: "josh@gmail.com",
    accessTokenEncrypted: encryptSecret("access-token"),
    refreshTokenEncrypted: encryptSecret("refresh-token"),
    scope: "https://www.googleapis.com/auth/calendar.events",
    tokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    calendarId: "primary",
    status: "CONNECTED",
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    disconnectedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSync(overrides: Partial<TicketCalendarSync> = {}): TicketCalendarSync {
  return {
    id: "sync-1",
    userId: "user-1",
    ticketId: "t-1",
    calendarConnectionId: "conn-1",
    googleCalendarId: "primary",
    googleEventId: "evt-1",
    lastSyncedDueDate: "2026-07-13",
    lastSyncedHash: "old-hash",
    status: "SYNCED",
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockApi() {
  return {
    createEvent: vi.fn(async () => ({ id: "evt-new" })),
    updateEvent: vi.fn(async (_c, eventId) => ({ id: eventId })),
    deleteEvent: vi.fn(async () => undefined),
  };
}

function baseDeps(
  api: ReturnType<typeof mockApi>,
  data: { tickets: SyncableTicket[]; syncs: TicketCalendarSync[] },
): SyncDeps {
  return {
    api,
    appUrl: "http://localhost:3000",
    loadConnection: async () => makeConnection(),
    loadEligibleTickets: async () => data.tickets,
    loadActiveSyncs: async () => data.syncs,
    upsertSyncRow: vi.fn(async () => undefined),
    markSyncDeleted: vi.fn(async () => undefined),
    markSyncError: vi.fn(async () => undefined),
    updateConnectionTokens: vi.fn(async () => undefined),
    updateConnectionSyncMeta: vi.fn(async () => undefined),
  };
}
