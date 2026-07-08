import { describe, it, expect } from "vitest";
import { buildTicketWhere } from "@/server/queries/tickets";

describe("buildTicketWhere archived visibility", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  it("hides archived tickets from the default list", () => {
    const where = buildTicketWhere(workspaceId, {}, userId);
    expect(where.isArchived).toBe(false);
  });

  it("shows archived tickets when status filter is ARCHIVED", () => {
    const where = buildTicketWhere(workspaceId, { status: "ARCHIVED" }, userId);
    expect(where.isArchived).toBeUndefined();
    expect(where.AND).toEqual(expect.arrayContaining([{ status: "ARCHIVED" }]));
  });

  it("hides archived tickets when using quick filters", () => {
    const where = buildTicketWhere(workspaceId, { quick: "overdue" }, userId);
    expect(where.isArchived).toBe(false);
  });
});
