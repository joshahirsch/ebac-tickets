import { describe, expect, it } from "vitest";
import { GoogleCalendarApiError } from "./types";
import {
  buildTicketFailure,
  classifySyncError,
  formatSyncStatusLabel,
  hasCalendarWriteScope,
  parseGoogleApiErrorBody,
  parsePersistedSyncError,
  resolveSyncResultStatus,
  sanitizeErrorMessage,
  serializeSyncFailures,
} from "./sync-errors";

describe("sync error helpers", () => {
  it("sanitizes bearer tokens and encrypted blobs", () => {
    const sanitized = sanitizeErrorMessage(
      "Request failed Bearer ya29.secret-token v1:abc:def:ghi",
    );
    expect(sanitized).not.toContain("ya29.secret-token");
    expect(sanitized).toContain("[redacted]");
  });

  it("parses Google API error bodies", () => {
    const parsed = parseGoogleApiErrorBody(
      {
        error: {
          code: 403,
          message: "Insufficient Permission",
          errors: [{ reason: "insufficientPermissions", message: "Insufficient Permission" }],
        },
      },
      403,
      "fallback",
    );
    expect(parsed.status).toBe(403);
    expect(parsed.reason).toBe("insufficientPermissions");
    expect(parsed.message).toContain("Insufficient Permission");
  });

  it("classifies oauth scope and token refresh failures", () => {
    expect(
      classifySyncError(
        new GoogleCalendarApiError("Insufficient Permission", 403, {
          reason: "insufficientPermissions",
        }),
        "create",
      ),
    ).toBe("oauth_scope");
    expect(
      classifySyncError(new GoogleCalendarApiError("Invalid Credentials", 401), "create"),
    ).toBe("token_refresh");
  });

  it("builds sanitized per-ticket failures", () => {
    const failure = buildTicketFailure({
      ticketId: "t-1",
      ticketKey: "PMGT-2",
      title: "Example",
      operation: "create",
      err: new GoogleCalendarApiError("Invalid source url", 400, {
        code: 400,
        reason: "invalid",
      }),
    });
    expect(failure.ticketKey).toBe("PMGT-2");
    expect(failure.operation).toBe("create");
    expect(failure.category).toBe("event_payload");
    expect(failure.message).toContain("Invalid source url");
  });

  it("resolves SUCCESS, PARTIAL, and ERROR statuses", () => {
    expect(resolveSyncResultStatus({ created: 1, updated: 0, deleted: 0, skipped: 0, errors: 0 }, false)).toBe(
      "SUCCESS",
    );
    expect(resolveSyncResultStatus({ created: 1, updated: 0, deleted: 0, skipped: 0, errors: 2 }, false)).toBe(
      "PARTIAL",
    );
    expect(resolveSyncResultStatus({ created: 0, updated: 0, deleted: 0, skipped: 0, errors: 14 }, false)).toBe(
      "ERROR",
    );
  });

  it("formats sync status labels consistently", () => {
    expect(
      formatSyncStatusLabel("PARTIAL", {
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: 14,
      }),
    ).toBe("PARTIAL: 0 created, 0 updated, 0 deleted, 0 skipped, 14 errors");
  });

  it("serializes and parses persisted sync failures", () => {
    const serialized = serializeSyncFailures([
      {
        ticketId: "t-1",
        ticketKey: "PMGT-2",
        title: "Example",
        operation: "create",
        status: 403,
        code: "403",
        reason: "insufficientPermissions",
        message: "Insufficient Permission",
        category: "oauth_scope",
      },
    ]);
    const parsed = parsePersistedSyncError(serialized);
    expect(parsed?.summary).toContain("1 ticket(s) failed");
    expect(parsed?.failures).toHaveLength(1);
    expect(parsed?.reconnectRequired).toBe(true);
  });

  it("detects missing calendar write scopes", () => {
    expect(hasCalendarWriteScope("openid email profile")).toBe(false);
    expect(
      hasCalendarWriteScope(
        "openid email https://www.googleapis.com/auth/calendar.events",
      ),
    ).toBe(true);
  });
});
