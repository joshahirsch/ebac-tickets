import { requireUser } from "@/lib/auth";
import { toDateOnly } from "@/lib/date/date-only";
import { parseCalendarSearchParams } from "@/lib/calendar/calendar-search-params";
import { getCalendarTickets } from "@/server/queries/tickets";
import { getProjects, getAssignableUsers } from "@/server/queries/lookups";
import { TicketFilters } from "@/components/ticket/ticket-filters";
import {
  CalendarMonthView,
  mapTicketForCalendar,
} from "@/components/calendar/calendar-month-view";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

function first(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function CalendarPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { params, yearMonth } = parseCalendarSearchParams(sp, user.id);

  const [tickets, projects, users] = await Promise.all([
    getCalendarTickets(user.workspaceId, user.id, params, yearMonth),
    getProjects(user.workspaceId),
    getAssignableUsers(user.workspaceId),
  ]);

  const filterKeys = ["q", "project", "projectId", "status", "priority", "type", "assignee", "assigneeId", "view", "quick", "archived", "labelId"] as const;
  const hasActiveFilters = filterKeys.some((k) => Boolean(first(sp, k)));

  const filterQuery: Record<string, string | undefined> = {};
  for (const k of filterKeys) {
    const v = first(sp, k);
    if (v) filterQuery[k] = v;
  }

  const views = tickets.flatMap((t) => {
    const dueDate = toDateOnly(t.dueDate);
    if (!dueDate) return [];
    return [
      mapTicketForCalendar(
        {
          id: t.id,
          number: t.number,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate,
          project: t.project,
          assignee: t.assignee,
        },
        process.env.NEXT_PUBLIC_APP_URL,
      ),
    ];
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">Tickets by due date</p>
      </div>

      <TicketFilters projects={projects} users={users} />

      <CalendarMonthView
        yearMonth={yearMonth}
        tickets={views}
        hasActiveFilters={hasActiveFilters}
        filterQuery={filterQuery}
      />
    </div>
  );
}
