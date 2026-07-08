import { toDateOnly, type DateOnly } from "@/lib/date/date-only";

export type CalendarTicketInput = {
  id: string;
  dueDate: Date | string | null | undefined;
};

/**
 * Group tickets by their intended calendar due day (UTC date-only).
 * Tickets without a due date are excluded.
 */
export function groupTicketsByDueDate<T extends CalendarTicketInput>(
  tickets: T[],
): Map<DateOnly, T[]> {
  const groups = new Map<DateOnly, T[]>();
  for (const ticket of tickets) {
    const dateOnly = toDateOnly(ticket.dueDate);
    if (!dateOnly) continue;
    const existing = groups.get(dateOnly);
    if (existing) existing.push(ticket);
    else groups.set(dateOnly, [ticket]);
  }
  return groups;
}
