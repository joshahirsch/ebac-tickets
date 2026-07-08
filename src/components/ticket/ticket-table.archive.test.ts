import { describe, expect, it } from "vitest";
import { ticketTableShowsArchiveControls } from "@/components/ticket/ticket-table.archive";

describe("TicketTable archive controls visibility", () => {
  it.each(["ADMIN", "MANAGER"] as const)("shows archive controls for %s", (role) => {
    expect(ticketTableShowsArchiveControls(role)).toBe(true);
  });

  it.each(["MEMBER", "VIEWER"] as const)("hides archive controls for %s", (role) => {
    expect(ticketTableShowsArchiveControls(role)).toBe(false);
  });
});
