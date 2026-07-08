import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeSortParam,
  parseTicketListSearchParams,
  quickToView,
  viewToQuick,
} from "@/lib/ticket-list-search-params";
import { buildTicketWhere, parseSort, getTicketById } from "@/server/queries/tickets";
import { dueThisWeekRange, overdueBefore } from "@/lib/date/date-only";

const ticketFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: (...args: unknown[]) => ticketFindFirst(...args),
    },
  },
}));

const workspaceId = "ws-1";
const userId = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTicketById", () => {
  it("returns null without querying when id is empty", async () => {
    await expect(getTicketById("", workspaceId)).resolves.toBeNull();
    await expect(getTicketById("   ", workspaceId)).resolves.toBeNull();
    expect(ticketFindFirst).not.toHaveBeenCalled();
  });

  it("queries by the trimmed database id and workspace", async () => {
    ticketFindFirst.mockResolvedValue({
      id: "cmrc5885y002ylmhmodfqkx5g",
      number: 19,
      title: "Build Phase Two implementation menu",
      project: { id: "proj-pmgt", key: "PMGT", name: "EBAC Project Management" },
    });

    const ticket = await getTicketById("  cmrc5885y002ylmhmodfqkx5g  ", workspaceId);

    expect(ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "cmrc5885y002ylmhmodfqkx5g",
          project: { workspaceId },
        },
      }),
    );
    expect(ticket?.project.key).toBe("PMGT");
    expect(ticket?.number).toBe(19);
  });

  it("returns null when no ticket matches the id", async () => {
    ticketFindFirst.mockResolvedValue(null);

    await expect(getTicketById("missing-ticket-id", workspaceId)).resolves.toBeNull();
  });
});

describe("parseTicketListSearchParams", () => {
  it("maps canonical view params to quick filters", () => {
    const { params } = parseTicketListSearchParams({ view: "due-this-week" }, userId);
    expect(params.quick).toBe("due-week");
  });

  it("supports legacy quick params", () => {
    const { params } = parseTicketListSearchParams({ quick: "overdue" }, userId);
    expect(params.quick).toBe("overdue");
  });

  it("resolves assignee=me to the current user id", () => {
    const { params } = parseTicketListSearchParams({ assignee: "me" }, userId);
    expect(params.assigneeId).toBe(userId);
  });

  it("maps project param to projectId", () => {
    const { params } = parseTicketListSearchParams({ project: "proj-1" }, userId);
    expect(params.projectId).toBe("proj-1");
  });

  it("sets includeArchived when archived=true", () => {
    const { viewingArchived, params } = parseTicketListSearchParams({ archived: "true" }, userId);
    expect(viewingArchived).toBe(true);
    expect(params.includeArchived).toBe(true);
  });

  it("supports legacy status=ARCHIVED for archived view", () => {
    const { viewingArchived } = parseTicketListSearchParams({ status: "ARCHIVED" }, userId);
    expect(viewingArchived).toBe(true);
  });

  it("sets sort for recently-updated view", () => {
    const { params, currentSort } = parseTicketListSearchParams({ view: "recently-updated" }, userId);
    expect(params.quick).toBe("recent");
    expect(currentSort).toBe("updatedAt:desc");
  });

  it("normalizes sort=updated-desc", () => {
    const { currentSort } = parseTicketListSearchParams({ sort: "updated-desc" }, userId);
    expect(currentSort).toBe("updatedAt:desc");
  });
});

describe("view/quick helpers", () => {
  it("converts between view and quick keys", () => {
    expect(viewToQuick("high-priority")).toBe("high");
    expect(quickToView("due-week")).toBe("due-this-week");
  });
});

describe("normalizeSortParam", () => {
  it("passes through field:dir format", () => {
    expect(normalizeSortParam("title:asc")).toBe("title:asc");
  });

  it("converts hyphenated sort tokens", () => {
    expect(normalizeSortParam("updatedAt-desc")).toBe("updatedAt:desc");
  });
});

describe("parseSort", () => {
  it("defaults to updatedAt desc", () => {
    expect(parseSort()).toEqual({ updatedAt: "desc" });
  });

  it("parses hyphenated sort tokens", () => {
    expect(parseSort("updatedAt-desc")).toEqual({ updatedAt: "desc" });
  });
});

describe("buildTicketWhere archived visibility", () => {
  it("hides archived tickets from the default list", () => {
    const where = buildTicketWhere(workspaceId, {}, userId);
    expect(where.isArchived).toBe(false);
  });

  it("shows archived tickets when status filter is ARCHIVED", () => {
    const where = buildTicketWhere(workspaceId, { status: "ARCHIVED" }, userId);
    expect(where.isArchived).toBeUndefined();
    expect(where.AND).toEqual(expect.arrayContaining([{ status: "ARCHIVED" }]));
  });

  it("shows archived tickets when includeArchived is true", () => {
    const where = buildTicketWhere(workspaceId, { includeArchived: true }, userId);
    expect(where.isArchived).toBeUndefined();
    expect(where.AND).toEqual(expect.arrayContaining([{ isArchived: true }]));
  });

  it("hides archived tickets when using quick filters", () => {
    const where = buildTicketWhere(workspaceId, { quick: "overdue" }, userId);
    expect(where.isArchived).toBe(false);
  });
});

describe("buildTicketWhere field filters", () => {
  it("filters by search query on title and description", () => {
    const where = buildTicketWhere(workspaceId, { q: "footer" }, userId);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { title: { contains: "footer", mode: "insensitive" } },
            { description: { contains: "footer", mode: "insensitive" } },
          ],
        },
      ]),
    );
  });

  it("filters by status", () => {
    const where = buildTicketWhere(workspaceId, { status: "TODO" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ status: "TODO" }]));
  });

  it("filters by priority", () => {
    const where = buildTicketWhere(workspaceId, { priority: "HIGH" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ priority: "HIGH" }]));
  });

  it("filters by type", () => {
    const where = buildTicketWhere(workspaceId, { type: "TASK" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ type: "TASK" }]));
  });

  it("filters by projectId", () => {
    const where = buildTicketWhere(workspaceId, { projectId: "proj-1" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ projectId: "proj-1" }]));
  });

  it("filters by assigneeId", () => {
    const where = buildTicketWhere(workspaceId, { assigneeId: "user-2" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ assigneeId: "user-2" }]));
  });

  it("filters unassigned tickets", () => {
    const where = buildTicketWhere(workspaceId, { assigneeId: "unassigned" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ assigneeId: null }]));
  });
});

describe("buildTicketWhere quick/view filters", () => {
  it("filters my tickets by current user id", () => {
    const where = buildTicketWhere(workspaceId, { quick: "my" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ assigneeId: userId }]));
  });

  it("filters due this week with open statuses", () => {
    const where = buildTicketWhere(workspaceId, { quick: "due-week" }, userId);
    const { gte, lte } = dueThisWeekRange();
    expect(where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dueDate: { gte, lte },
          status: { in: ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        }),
      ]),
    );
  });

  it("filters overdue tickets excluding completed statuses", () => {
    const where = buildTicketWhere(workspaceId, { quick: "overdue" }, userId);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          dueDate: { lt: overdueBefore() },
          status: { in: ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
      ]),
    );
  });

  it("filters blocked tickets", () => {
    const where = buildTicketWhere(workspaceId, { quick: "blocked" }, userId);
    expect(where.AND).toEqual(expect.arrayContaining([{ status: "BLOCKED" }]));
  });

  it("filters high priority open tickets", () => {
    const where = buildTicketWhere(workspaceId, { quick: "high" }, userId);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          priority: { in: ["HIGH", "URGENT"] },
          status: { in: ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
      ]),
    );
  });

  it("does not add a date filter for recently updated view", () => {
    const where = buildTicketWhere(workspaceId, { quick: "recent" }, userId);
    const clauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    const hasUpdatedAtFilter = clauses.some(
      (clause) => typeof clause === "object" && clause !== null && "updatedAt" in clause,
    );
    expect(hasUpdatedAtFilter).toBe(false);
  });
});

describe("buildTicketWhere combined filters", () => {
  it("composes high priority with project and status", () => {
    const where = buildTicketWhere(
      workspaceId,
      { quick: "high", projectId: "proj-ops", status: "IN_PROGRESS" },
      userId,
    );
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { status: "IN_PROGRESS" },
        { projectId: "proj-ops" },
        {
          priority: { in: ["HIGH", "URGENT"] },
          status: { in: ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
      ]),
    );
  });

  it("composes search with status", () => {
    const where = buildTicketWhere(workspaceId, { q: "grant", status: "BLOCKED" }, userId);
    expect(where.AND).toHaveLength(2);
  });
});
