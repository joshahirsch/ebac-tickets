import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl, ticketDetailUrl } from "./google-calendar-url";

describe("buildGoogleCalendarUrl", () => {
  it("encodes title, all-day date range, and description with ticket URL", () => {
    const url = buildGoogleCalendarUrl({
      key: "PMGT-2",
      title: "Kickoff planning & setup",
      dueDate: "2026-07-13",
      description: "Plan the kickoff agenda.",
      ticketUrl: "https://tickets.example.com/tickets/abc",
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("[PMGT-2] Kickoff planning & setup");
    // All-day: exclusive end date is the next calendar day.
    expect(parsed.searchParams.get("dates")).toBe("20260713/20260714");
    expect(parsed.searchParams.get("details")).toContain("Plan the kickoff agenda.");
    expect(parsed.searchParams.get("details")).toContain(
      "EBAC ticket: https://tickets.example.com/tickets/abc",
    );
  });

  it("still includes the ticket URL when description is empty", () => {
    const url = buildGoogleCalendarUrl({
      key: "EBAC-1",
      title: "Untitled work",
      dueDate: "2026-08-01",
      description: null,
      ticketUrl: "http://localhost:3000/tickets/t1",
    });
    const details = new URL(url).searchParams.get("details");
    expect(details).toBe("EBAC ticket: http://localhost:3000/tickets/t1");
    expect(new URL(url).searchParams.get("dates")).toBe("20260801/20260802");
  });
});

describe("ticketDetailUrl", () => {
  it("joins app URL and ticket id without a trailing slash", () => {
    expect(ticketDetailUrl("abc", "https://app.example.com/")).toBe(
      "https://app.example.com/tickets/abc",
    );
  });

  it("adds https when app URL omits protocol", () => {
    expect(ticketDetailUrl("abc", "tickets.example.com")).toBe(
      "https://tickets.example.com/tickets/abc",
    );
  });
});
