import { describe, expect, it } from "vitest";
import {
  UNASSIGNED_ASSIGNEE_KEY,
  buildAssigneeLegendItems,
  getAssigneeColorClasses,
  getAssigneeColorKey,
  getAssigneeDisplayName,
} from "@/lib/calendar/assignee-colors";

describe("getAssigneeColorKey", () => {
  it("prefers id over email and name", () => {
    expect(
      getAssigneeColorKey({
        id: "user-1",
        email: "other@example.com",
        name: "Other",
      }),
    ).toBe("user-1");
  });

  it("falls back to email when id is missing", () => {
    expect(getAssigneeColorKey({ email: "Josh@Example.com", name: "Josh" })).toBe(
      "josh@example.com",
    );
  });

  it("falls back to name when id and email are missing", () => {
    expect(getAssigneeColorKey({ name: "Daria Smith" })).toBe("daria smith");
  });

  it("returns unassigned for null assignee and blank values", () => {
    expect(getAssigneeColorKey(null)).toBe(UNASSIGNED_ASSIGNEE_KEY);
    expect(getAssigneeColorKey({ id: "  ", email: "", name: undefined })).toBe(
      UNASSIGNED_ASSIGNEE_KEY,
    );
  });
});

describe("getAssigneeColorClasses", () => {
  it("returns the same class for the same assignee key", () => {
    const assignee = { id: "user-42", name: "Josh Hirsch", email: "josh@example.com" };
    const first = getAssigneeColorClasses(assignee);
    const second = getAssigneeColorClasses({ ...assignee });
    expect(first).toEqual(second);
  });

  it("usually returns different classes for different assignee keys", () => {
    const josh = getAssigneeColorClasses({ id: "user-1", name: "Josh", email: "josh@example.com" });
    const daria = getAssigneeColorClasses({
      id: "user-2",
      name: "Daria",
      email: "daria@example.com",
    });
    const alex = getAssigneeColorClasses({ id: "user-3", name: "Alex", email: "alex@example.com" });
    const classes = new Set([josh.pill, daria.pill, alex.pill]);
    expect(classes.size).toBeGreaterThan(1);
  });

  it("returns stable unassigned fallback styling", () => {
    const unassigned = getAssigneeColorClasses(null);
    expect(unassigned.pill).toContain("slate");
    expect(getAssigneeColorClasses(null)).toEqual(unassigned);
    expect(getAssigneeColorClasses({ id: "", email: "", name: "" })).toEqual(unassigned);
  });
});

describe("getAssigneeDisplayName", () => {
  it("uses name, then email, then Unassigned", () => {
    expect(getAssigneeDisplayName({ name: "Josh Hirsch", email: "josh@example.com" })).toBe(
      "Josh Hirsch",
    );
    expect(getAssigneeDisplayName({ name: null, email: "josh@example.com" })).toBe(
      "josh@example.com",
    );
    expect(getAssigneeDisplayName(null)).toBe("Unassigned");
  });
});

describe("buildAssigneeLegendItems", () => {
  it("counts visible tickets and sorts alphabetically with Unassigned last", () => {
    const items = buildAssigneeLegendItems([
      { assignee: { id: "b", name: "Daria Smith", email: "daria@example.com" } },
      { assignee: { id: "a", name: "Josh Hirsch", email: "josh@example.com" } },
      { assignee: { id: "a", name: "Josh Hirsch", email: "josh@example.com" } },
      { assignee: null },
    ]);

    expect(items.map((item) => `${item.displayName} · ${item.count}`)).toEqual([
      "Daria Smith · 1",
      "Josh Hirsch · 2",
      "Unassigned · 1",
    ]);
  });
});
