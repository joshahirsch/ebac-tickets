import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { formatDueDate } from "@/lib/date/date-only";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/server/queries/dashboard";
import { TICKET_STATUS_ORDER, TICKET_STATUS_META } from "@/lib/constants";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { forbidden?: string };
}) {
  const user = await requireUser();
  const data = await getDashboardData(user.workspaceId);
  const { counts, byStatus, byAssignee, recentlyUpdated, dueSoonTickets } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </p>
        </div>
      </div>

      {searchParams.forbidden ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          You don&apos;t have permission to access that page.
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open tickets" value={counts.totalOpen} href="/tickets" />
        <StatCard label="Due this week" value={counts.dueSoon} href="/tickets?view=due-this-week" tone="warning" />
        <StatCard label="Overdue" value={counts.overdue} href="/tickets?view=overdue" tone="danger" />
        <StatCard label="Blocked" value={counts.blocked} href="/tickets?view=blocked" tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tickets by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TICKET_STATUS_ORDER.map((status) => {
              const count = byStatus[status] ?? 0;
              return (
                <Link
                  key={status}
                  href={`/tickets?status=${status}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* By assignee */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open tickets by assignee</CardTitle>
          </CardHeader>
          <CardContent>
            {byAssignee.length === 0 ? (
              <EmptyLine text="No open tickets." />
            ) : (
              <div className="space-y-2">
                {byAssignee.map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-sm">
                    <span>{row.name}</span>
                    <span className="font-medium tabular-nums text-muted-foreground">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Due soon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due soon</CardTitle>
          </CardHeader>
          <CardContent>
            {dueSoonTickets.length === 0 ? (
              <EmptyLine text="Nothing due in the next 7 days." />
            ) : (
              <ul className="divide-y">
                {dueSoonTickets.map((t) => (
                  <li key={t.id} className="py-2">
                    <Link href={`/tickets/${t.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span className="truncate text-sm">
                        <span className="text-muted-foreground">{t.project.key}-{t.number}</span> {t.title}
                      </span>
                      <span className="shrink-0 text-xs text-amber-600">
                        {t.dueDate ? formatDueDate(t.dueDate) : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recently updated */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently updated</CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyUpdated.length === 0 ? (
              <EmptyLine text="No tickets yet. Create your first ticket to get started." />
            ) : (
              <ul className="divide-y">
                {recentlyUpdated.map((t) => (
                  <li key={t.id} className="py-2">
                    <Link href={`/tickets/${t.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm">
                          <span className="text-muted-foreground">{t.project.key}-{t.number}</span> {t.title}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {formatDistanceToNow(t.updatedAt, { addSuffix: true })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
