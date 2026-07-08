import { GoogleCalendarApiError } from "./types";

export type SyncFailureCategory =
  | "token_refresh"
  | "oauth_scope"
  | "event_payload"
  | "api_permission"
  | "missing_mapping"
  | "unknown";

export type SyncTicketFailure = {
  ticketId: string;
  ticketKey: string;
  title: string;
  operation: "create" | "update" | "delete";
  status: number | null;
  code: string | null;
  reason: string | null;
  message: string;
  category: SyncFailureCategory;
};

export type SyncResultStatus = "SUCCESS" | "PARTIAL" | "ERROR";

export type PersistedSyncErrorDetails = {
  summary: string;
  failures: SyncTicketFailure[];
  reconnectRequired?: boolean;
};

const SENSITIVE_PATTERNS = [
  /Bearer\s+\S+/gi,
  /ya29\.[A-Za-z0-9._-]+/g,
  /refresh_token[=:]\s*\S+/gi,
  /access_token[=:]\s*\S+/gi,
  /v1:[A-Za-z0-9+/=:_-]+/g,
];

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message.trim();
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[redacted]");
  }
  if (sanitized.length > 500) {
    return `${sanitized.slice(0, 497)}...`;
  }
  return sanitized;
}

export type ParsedGoogleApiError = {
  status: number;
  message: string;
  code: number | null;
  reason: string | null;
};

export function parseGoogleApiErrorBody(
  body: unknown,
  status: number,
  fallback: string,
): ParsedGoogleApiError {
  const data = body as {
    error?: {
      message?: string;
      code?: number;
      errors?: Array<{ reason?: string; message?: string }>;
    };
  };
  const reason = data.error?.errors?.[0]?.reason ?? null;
  const message = data.error?.errors?.[0]?.message ?? data.error?.message ?? fallback;
  return {
    status,
    message: sanitizeErrorMessage(message),
    code: data.error?.code ?? status,
    reason,
  };
}

export function classifySyncError(
  err: unknown,
  operation: SyncTicketFailure["operation"],
): SyncFailureCategory {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    if (
      message.includes("reconnect") ||
      message.includes("refresh") ||
      message.includes("invalid credentials")
    ) {
      return "token_refresh";
    }
    if (message.includes("write access is missing") || message.includes("insufficient")) {
      return "oauth_scope";
    }
  }

  if (err instanceof GoogleCalendarApiError) {
    if (err.status === 401) return "token_refresh";
    if (err.status === 403) {
      const message = err.message.toLowerCase();
      const reason = (err.reason ?? "").toLowerCase();
      if (
        message.includes("insufficient") ||
        message.includes("scope") ||
        reason.includes("insufficientpermissions")
      ) {
        return "oauth_scope";
      }
      return "api_permission";
    }
    if (err.status === 400 || err.status === 422) return "event_payload";
    if ((err.status === 404 || err.status === 410) && operation === "update") {
      return "missing_mapping";
    }
  }

  return "unknown";
}

export function buildTicketFailure(params: {
  ticketId: string;
  ticketKey: string;
  title: string;
  operation: SyncTicketFailure["operation"];
  err: unknown;
}): SyncTicketFailure {
  const category = classifySyncError(params.err, params.operation);
  let status: number | null = null;
  let code: string | null = null;
  let reason: string | null = null;
  let message = "Sync failed.";

  if (params.err instanceof GoogleCalendarApiError) {
    status = params.err.status;
    code = params.err.code != null ? String(params.err.code) : String(params.err.status);
    reason = params.err.reason;
    message = sanitizeErrorMessage(params.err.message);
  } else if (params.err instanceof Error) {
    message = sanitizeErrorMessage(params.err.message);
  }

  return {
    ticketId: params.ticketId,
    ticketKey: params.ticketKey,
    title: params.title,
    operation: params.operation,
    status,
    code,
    reason,
    message,
    category,
  };
}

export function formatSyncStatusLabel(
  status: SyncResultStatus,
  summary: { created: number; updated: number; deleted: number; skipped: number; errors: number },
): string {
  return `${status}: ${summary.created} created, ${summary.updated} updated, ${summary.deleted} deleted, ${summary.skipped} skipped, ${summary.errors} errors`;
}

export function resolveSyncResultStatus(
  summary: { created: number; updated: number; deleted: number; skipped: number; errors: number },
  connectionFailed: boolean,
): SyncResultStatus {
  if (connectionFailed) return "ERROR";
  if (summary.errors === 0) return "SUCCESS";
  const successes = summary.created + summary.updated + summary.deleted;
  if (successes === 0 && summary.skipped === 0 && summary.errors > 0) return "ERROR";
  return "PARTIAL";
}

export function serializeSyncFailures(failures: SyncTicketFailure[]): string | null {
  if (failures.length === 0) return null;
  const reconnectRequired = failures.some(
    (failure) => failure.category === "oauth_scope" || failure.category === "token_refresh",
  );
  const payload: PersistedSyncErrorDetails = {
    summary: `${failures.length} ticket(s) failed to sync.`,
    failures: failures.slice(0, 50),
    ...(reconnectRequired ? { reconnectRequired: true } : {}),
  };
  return JSON.stringify(payload);
}

export function parsePersistedSyncError(
  value: string | null | undefined,
): PersistedSyncErrorDetails | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PersistedSyncErrorDetails;
    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.failures)) {
      return { summary: value, failures: [] };
    }
    return parsed;
  } catch {
    return { summary: value, failures: [] };
  }
}

export function hasCalendarWriteScope(scope: string | null | undefined): boolean {
  if (!scope?.trim()) return true;
  const scopes = scope.split(/\s+/);
  return scopes.some(
    (entry) =>
      entry === "https://www.googleapis.com/auth/calendar.events" ||
      entry === "https://www.googleapis.com/auth/calendar",
  );
}

export function missingCalendarScopeMessage(): string {
  return "Google Calendar write access is missing. Disconnect and reconnect Google Calendar to grant event sync permissions.";
}
