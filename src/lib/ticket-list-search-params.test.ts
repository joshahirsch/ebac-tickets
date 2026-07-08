import { describe, it, expect } from "vitest";
import {
  normalizeSortParam,
  parseTicketListSearchParams,
  quickToView,
  viewToQuick,
} from "@/lib/ticket-list-search-params";

describe("ticket-list-search-params", () => {
  const userId = "user-abc";

  it("maps canonical view params to quick filters", () => {
    const { params } = parseTicketListSearchParams({ view: "my" }, userId);
    expect(params.quick).toBe("my");
  });

  it("supports legacy quick params", () => {
    const { params } = parseTicketListSearchParams({ quick: "blocked" }, userId);
    expect(params.quick).toBe("blocked");
    expect(quickToView("blocked")).toBe("blocked");
    expect(viewToQuick("blocked")).toBe("blocked");
  });

  it("prefers view over quick when both are present", () => {
    const { params } = parseTicketListSearchParams({ view: "overdue", quick: "my" }, userId);
    expect(params.quick).toBe("overdue");
  });
});

describe("normalizeSortParam", () => {
  it("converts updated-desc to updatedAt:desc", () => {
    expect(normalizeSortParam("updated-desc")).toBe("updatedAt:desc");
  });
});
