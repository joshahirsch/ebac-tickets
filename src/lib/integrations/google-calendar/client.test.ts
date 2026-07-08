import { describe, expect, it, vi } from "vitest";
import { createGoogleCalendarClient } from "./client";
import type { GoogleCalendarEventPayload } from "./types";

describe("createGoogleCalendarClient", () => {
  it("posts date-only all-day payloads without timeZone or dateTime", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "evt-1" }),
    }));

    const client = createGoogleCalendarClient(fetchImpl as unknown as typeof fetch);
    const event: GoogleCalendarEventPayload = {
      summary: "[PMGT-2] Example",
      description: "Ticket details",
      start: { date: "2026-07-13" },
      end: { date: "2026-07-14" },
      transparency: "transparent",
    };

    await client.createEvent("primary", event, "access-token");

    expect(fetchImpl).toHaveBeenCalledOnce();
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String(init.body));
    expect(body.start).toEqual({ date: "2026-07-13" });
    expect(body.end).toEqual({ date: "2026-07-14" });
    expect(body.start.timeZone).toBeUndefined();
    expect(body.end.timeZone).toBeUndefined();
    expect(body.start.dateTime).toBeUndefined();
  });

  it("surfaces sanitized Google API errors", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({
        error: {
          code: 403,
          message: "Insufficient Permission",
          errors: [{ reason: "insufficientPermissions", message: "Insufficient Permission" }],
        },
      }),
    }));

    const client = createGoogleCalendarClient(fetchImpl as unknown as typeof fetch);
    await expect(
      client.createEvent(
        "primary",
        {
          summary: "Test",
          description: "Test",
          start: { date: "2026-07-13" },
          end: { date: "2026-07-14" },
          transparency: "transparent",
        },
        "access-token",
      ),
    ).rejects.toMatchObject({
      status: 403,
      reason: "insufficientPermissions",
      message: "Insufficient Permission",
    });
  });
});
