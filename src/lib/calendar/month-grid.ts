import {
  addDaysToDateOnly,
  endOfMonthDateOnly,
  parseYearMonth,
  startOfMonthDateOnly,
  type DateOnly,
  type YearMonth,
} from "@/lib/date/date-only";

export type MonthGridCell = {
  dateOnly: DateOnly;
  /** True when the cell belongs to the navigated month (not padding). */
  inCurrentMonth: boolean;
};

/**
 * Build a Sunday-start month grid (always 6 weeks / 42 cells) from a yyyy-mm value.
 * All dates are calendar-day strings — no local timezone conversion.
 */
export function buildMonthGrid(yearMonth: YearMonth): MonthGridCell[] {
  const parts = parseYearMonth(yearMonth);
  if (!parts) throw new Error(`Invalid year-month value: ${yearMonth}`);

  const first = startOfMonthDateOnly(yearMonth);
  const last = endOfMonthDateOnly(yearMonth);

  // UTC noon weekday: 0 = Sunday … 6 = Saturday
  const firstUtc = new Date(Date.UTC(parts.year, parts.month - 1, 1, 12, 0, 0));
  const startOffset = firstUtc.getUTCDay();

  const gridStart = addDaysToDateOnly(first, -startOffset);
  const cells: MonthGridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const dateOnly = addDaysToDateOnly(gridStart, i);
    cells.push({
      dateOnly,
      inCurrentMonth: dateOnly >= first && dateOnly <= last,
    });
  }
  return cells;
}

/** Inclusive visible range covering the padded month grid. */
export function monthGridDateRange(yearMonth: YearMonth): { start: DateOnly; end: DateOnly } {
  const cells = buildMonthGrid(yearMonth);
  return { start: cells[0]!.dateOnly, end: cells[cells.length - 1]!.dateOnly };
}
