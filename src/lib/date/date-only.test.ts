import { describe, expect, it } from "vitest";
import {
  addDaysToDateOnly,
  dueDateInputValue,
  dueDatesEqual,
  dueThisWeekRange,
  formatDateOnlyCompact,
  formatDateOnlyLong,
  formatDueDate,
  isDateOnlyPast,
  overdueBefore,
  parseFormDateOnly,
  toDateOnly,
  todayDateOnlyUtc,
} from "./date-only";

describe("toDateOnly", () => {
  it("extracts the UTC calendar day from UTC-midnight timestamps", () => {
    expect(toDateOnly(new Date("2026-07-13T00:00:00.000Z"))).toBe("2026-07-13");
  });

  it("extracts the UTC calendar day from UTC-noon timestamps", () => {
    expect(toDateOnly(new Date("2026-07-13T12:00:00.000Z"))).toBe("2026-07-13");
  });

  it("returns null for empty values", () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
  });
});

describe("parseFormDateOnly", () => {
  it("stores form dates at UTC noon without timezone drift", () => {
    const date = parseFormDateOnly("2026-07-13");
    expect(date.toISOString()).toBe("2026-07-13T12:00:00.000Z");
  });
});

describe("formatting", () => {
  it("formats compact and long labels from date-only values", () => {
    expect(formatDateOnlyCompact("2026-07-13")).toBe("Jul 13");
    expect(formatDateOnlyLong("2026-07-13")).toBe("Jul 13, 2026");
  });

  it("formats DB timestamps consistently regardless of local timezone", () => {
    expect(formatDueDate("2026-07-13T00:00:00.000Z")).toBe("Jul 13");
    expect(formatDueDate("2026-07-13T12:00:00.000Z")).toBe("Jul 13");
  });

  it("uses the same calendar day for date inputs", () => {
    expect(dueDateInputValue("2026-07-13T00:00:00.000Z")).toBe("2026-07-13");
    expect(dueDateInputValue("2026-07-13T12:00:00.000Z")).toBe("2026-07-13");
  });
});

describe("calendar comparisons", () => {
  it("treats the due day itself as not overdue", () => {
    expect(isDateOnlyPast("2026-07-13", "2026-07-13")).toBe(false);
    expect(isDateOnlyPast("2026-07-12", "2026-07-13")).toBe(true);
  });

  it("compares persisted values by calendar day", () => {
    expect(dueDatesEqual("2026-07-13T00:00:00.000Z", "2026-07-13T12:00:00.000Z")).toBe(true);
    expect(dueDatesEqual("2026-07-12T12:00:00.000Z", "2026-07-13T12:00:00.000Z")).toBe(false);
  });
});

describe("filter boundaries", () => {
  it("builds due-this-week and overdue ranges from calendar days", () => {
    const reference = new Date("2026-07-08T15:30:00.000Z");
    const week = dueThisWeekRange(reference);
    expect(week.gte.toISOString()).toBe("2026-07-08T00:00:00.000Z");
    expect(week.lte.toISOString()).toBe("2026-07-15T23:59:59.999Z");
    expect(overdueBefore(reference).toISOString()).toBe("2026-07-08T00:00:00.000Z");
    expect(todayDateOnlyUtc(reference)).toBe("2026-07-08");
    expect(addDaysToDateOnly("2026-07-08", 7)).toBe("2026-07-15");
  });
});

describe("PMGT kickoff due dates", () => {
  it("keeps PMGT-2 due date stable across display and input helpers", () => {
    const stored = parseFormDateOnly("2026-07-12");
    expect(formatDueDate(stored)).toBe("Jul 12");
    expect(dueDateInputValue(stored)).toBe("2026-07-12");
  });

  it("keeps Jul 13 kickoff cards stable across midnight and noon storage", () => {
    expect(formatDueDate("2026-07-13T00:00:00.000Z")).toBe("Jul 13");
    expect(dueDateInputValue("2026-07-13T12:00:00.000Z")).toBe("2026-07-13");
  });
});
