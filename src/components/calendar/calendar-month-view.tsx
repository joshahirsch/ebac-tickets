import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addMonthsToYearMonth,
  formatYearMonthLong,
  todayDateOnlyUtc,
  type DateOnly,
  type YearMonth,
} from "@/lib/date/date-only";
import { buildMonthGrid } from "@/lib/calendar/month-grid";
import { groupTicketsByDueDate } from "@/lib/calendar/group-tickets-by-due-date";
import {
  buildGoogleCalendarUrl,
  ticketDetailUrl,
} from "@/lib/calendar/google-calendar-url";
import { AddToGoogleCalendarLink } from "@/components/calendar/add-to-google-calendar-link";
import { Button } from "@/components/ui/button";
import type { CalendarTicketItem } from "@/server/queries/tickets";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_VISIBLE = 3;

export type CalendarTicketView = {
  id: string;
  key: string;
  title: string;
  dueDate: DateOnly;
  status: CalendarTicketItem["status"];
  priority: CalendarTicketItem["priority"];
  project: { key: string; name: string };
  assignee: { id: string; name: string | null; email: string } | null;
  href: string;
  googleCalendarUrl: string;
};

/** Map a DB/list ticket (plus date-only due) into calendar UI props. */
export function mapTicketForCalendar(
  ticket: {
    id: string;
    number: number;
    title: string;
    description?: string | null;
    status: CalendarTicketItem["status"];
    priority: CalendarTicketItem["priority"];
    dueDate: DateOnly;
    project: { key: string; name: string };
    assignee: { id: string; name: string | null; email: string } | null;
  },
  appUrl?: string,
): CalendarTicketView {
  const key = `${ticket.project.key}-${ticket.number}`;
  const href = `/tickets/${ticket.id}`;
  const absoluteUrl = ticketDetailUrl(ticket.id, appUrl);
  return {
    id: ticket.id,
    key,
    title: ticket.title,
    dueDate: ticket.dueDate,
    status: ticket.status,
    priority: ticket.priority,
    project: ticket.project,
    assignee: ticket.assignee,
    href,
    googleCalendarUrl: buildGoogleCalendarUrl({
      key,
      title: ticket.title,
      dueDate: ticket.dueDate,
      description: ticket.description,
      ticketUrl: absoluteUrl,
    }),
  };
}

function hrefWithMonth(
  yearMonth: YearMonth,
  searchParams: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) params.set(k, v);
  }
  params.set("month", yearMonth);
  const qs = params.toString();
  return qs ? `/calendar?${qs}` : `/calendar?month=${yearMonth}`;
}

export function CalendarMonthView({
  yearMonth,
  tickets,
  hasActiveFilters,
  filterQuery,
}: {
  yearMonth: YearMonth;
  tickets: CalendarTicketView[];
  hasActiveFilters: boolean;
  /** Non-month query params to preserve on prev/next navigation. */
  filterQuery: Record<string, string | undefined>;
}) {
  const today = todayDateOnlyUtc();
  const cells = buildMonthGrid(yearMonth);
  const byDate = groupTicketsByDueDate(tickets);
  const prev = addMonthsToYearMonth(yearMonth, -1);
  const next = addMonthsToYearMonth(yearMonth, 1);
  const inMonthCount = tickets.filter((t) => t.dueDate.startsWith(yearMonth)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href={hrefWithMonth(prev, filterQuery)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold tabular-nums">
            {formatYearMonthLong(yearMonth)}
          </h2>
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href={hrefWithMonth(next, filterQuery)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {yearMonth !== today.slice(0, 7) ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={hrefWithMonth(today.slice(0, 7), filterQuery)}>Today</Link>
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {inMonthCount === 0
            ? hasActiveFilters
              ? "No tickets match selected filters"
              : "No due-date tickets this month"
            : `${inMonthCount} due this month`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="grid min-w-[640px] grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid min-w-[640px] grid-cols-7 auto-rows-fr">
          {cells.map((cell) => {
            const dayTickets = byDate.get(cell.dateOnly) ?? [];
            const isToday = cell.dateOnly === today;
            const dayNum = Number(cell.dateOnly.slice(8, 10));
            const visible = dayTickets.slice(0, MAX_VISIBLE);
            const overflow = dayTickets.length - visible.length;

            return (
              <div
                key={cell.dateOnly}
                className={cn(
                  "min-h-[110px] border-b border-r p-1.5 last:border-r-0",
                  !cell.inCurrentMonth && "bg-muted/20",
                )}
                data-date={cell.dateOnly}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      !cell.inCurrentMonth && "text-muted-foreground/60",
                      isToday && "bg-primary font-semibold text-primary-foreground",
                      cell.inCurrentMonth && !isToday && "font-medium text-foreground",
                    )}
                    aria-current={isToday ? "date" : undefined}
                  >
                    {dayNum}
                  </span>
                </div>

                <ul className="space-y-0.5">
                  {visible.map((ticket) => (
                    <li key={ticket.id} className="group flex items-start gap-0.5">
                      <Link
                        href={ticket.href}
                        className={cn(
                          "min-w-0 flex-1 rounded px-1 py-0.5 text-left text-[11px] leading-snug",
                          "bg-primary/10 text-foreground hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        )}
                        title={`${ticket.key} ${ticket.title}`}
                      >
                        <span className="font-medium text-muted-foreground">{ticket.key}</span>{" "}
                        <span className="line-clamp-1">{ticket.title}</span>
                      </Link>
                      <AddToGoogleCalendarLink href={ticket.googleCalendarUrl} compact className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
                    </li>
                  ))}
                  {overflow > 0 ? (
                    <li className="px-1 text-[10px] text-muted-foreground">+{overflow} more</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {inMonthCount === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {hasActiveFilters
            ? "No tickets match selected filters. Clear filters to see more due dates."
            : "No due-date tickets this month. Set a due date on a ticket to see it here."}
        </p>
      ) : null}
    </div>
  );
}
