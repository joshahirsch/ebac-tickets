import { describe, expect, it } from "vitest";
import { buildMonthGrid, monthGridDateRange } from "./month-grid";
import {
  addMonthsToYearMonth,
  endOfMonthDateOnly,
  formatYearMonthLong,
  startOfMonthDateOnly,
} from "@/lib/date/date-only";

describe("buildMonthGrid", () => {
  it("builds a 42-cell Sunday-start grid without timezone drift", () => {
    // July 2026 starts on Wednesday (UTC).
    const cells = buildMonthGrid("2026-07");
    expect(cells).toHaveLength(42);
    expect(cells[0]!.dateOnly).toBe("2026-06-28");
    expect(cells[0]!.inCurrentMonth).toBe(false);
    expect(cells[3]!.dateOnly).toBe("2026-07-01");
    expect(cells[3]!.inCurrentMonth).toBe(true);
    expect(cells.find((c) => c.dateOnly === "2026-07-13")?.inCurrentMonth).toBe(true);
    expect(endOfMonthDateOnly("2026-07")).toBe("2026-07-31");
    expect(startOfMonthDateOnly("2026-07")).toBe("2026-07-01");
  });

  it("exposes inclusive padding range for DB queries", () => {
    const range = monthGridDateRange("2026-07");
    expect(range.start).toBe("2026-06-28");
    expect(range.end).toBe("2026-08-08");
  });
});

describe("year-month helpers", () => {
  it("navigates months and formats labels in UTC", () => {
    expect(addMonthsToYearMonth("2026-07", -1)).toBe("2026-06");
    expect(addMonthsToYearMonth("2026-07", 1)).toBe("2026-08");
    expect(formatYearMonthLong("2026-07")).toBe("July 2026");
  });
});
