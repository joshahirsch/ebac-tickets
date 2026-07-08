/** Calendar date in yyyy-mm-dd form (no time or timezone). */
export type DateOnly = string;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnlyParts(dateOnly: DateOnly): { year: number; month: number; day: number } {
  const match = DATE_ONLY_RE.exec(dateOnly);
  if (!match) throw new Error(`Invalid date-only value: ${dateOnly}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Read the UTC calendar day from a DB timestamp or ISO string. */
export function toDateOnly(value: Date | string | null | undefined): DateOnly | null {
  if (value == null) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse yyyy-mm-dd form input into a stable UTC-noon Date for persistence. */
export function parseFormDateOnly(dateOnly: string): Date {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/** Compact label, e.g. "Jul 13". */
export function formatDateOnlyCompact(dateOnly: DateOnly): string {
  return formatDateOnly(dateOnly, { month: "short", day: "numeric" });
}

/** Long label, e.g. "Jul 13, 2026". */
export function formatDateOnlyLong(dateOnly: DateOnly): string {
  return formatDateOnly(dateOnly, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateOnly(dateOnly: DateOnly, options: Intl.DateTimeFormatOptions): string {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(utcNoon);
}

export function formatDueDate(value: Date | string | null | undefined): string | null {
  const dateOnly = toDateOnly(value);
  return dateOnly ? formatDateOnlyCompact(dateOnly) : null;
}

export function dueDateInputValue(value: Date | string | null | undefined): string | null {
  return toDateOnly(value);
}

export function todayDateOnlyUtc(reference = new Date()): DateOnly {
  return toDateOnly(reference)!;
}

export function isDateOnlyBefore(a: DateOnly, b: DateOnly): boolean {
  return a < b;
}

export function isDateOnlyPast(dateOnly: DateOnly, today: DateOnly = todayDateOnlyUtc()): boolean {
  return isDateOnlyBefore(dateOnly, today);
}

export function addDaysToDateOnly(dateOnly: DateOnly, days: number): DateOnly {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return toDateOnly(shifted)!;
}

export function dateOnlyToUtcStart(dateOnly: DateOnly): Date {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function dateOnlyToUtcEnd(dateOnly: DateOnly): Date {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

/** Inclusive calendar-day window from today through today + 7 days. */
export function dueThisWeekRange(reference = new Date()): { gte: Date; lte: Date } {
  const today = todayDateOnlyUtc(reference);
  const lastDay = addDaysToDateOnly(today, 7);
  return {
    gte: dateOnlyToUtcStart(today),
    lte: dateOnlyToUtcEnd(lastDay),
  };
}

/** Tickets with a due calendar day strictly before today are overdue. */
export function overdueBefore(reference = new Date()): Date {
  return dateOnlyToUtcStart(todayDateOnlyUtc(reference));
}

/** Compare persisted due dates by calendar day, ignoring time-of-day. */
export function dueDatesEqual(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
): boolean {
  return toDateOnly(a) === toDateOnly(b);
}
