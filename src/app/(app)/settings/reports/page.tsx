import { requireUser } from "@/lib/auth";
import { getReportMetrics } from "@/server/queries/admin";
import { TICKET_TYPE_META, TICKET_PRIORITY_META, PROJECT_STATUS_META } from "@/lib/constants";
import type { TicketType, TicketPriority, ProjectStatus } from "@prisma/client";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsSettingsPage() {
  const user = await requireUser();
  const { totals, byType, byPriority, projects } = await getReportMetrics(user.workspaceId);
  const maxType = Math.max(1, ...byType.map((t) => t.count));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Reports</h2>
        <p className="text-sm text-muted-foreground">Workspace snapshot and 30-day throughput.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total (active)" value={totals.total} />
        <StatCard label="Open" value={totals.open} />
        <StatCard label="Blocked" value={totals.blocked} tone={totals.blocked ? "danger" : "default"} />
        <StatCard label="Overdue" value={totals.overdue} tone={totals.overdue ? "danger" : "default"} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Done (all time)" value={totals.done} />
        <StatCard label="Created · 30d" value={totals.createdLast30} />
        <StatCard label="Completed · 30d" value={totals.doneLast30} />
        <StatCard
          label="Net · 30d"
          value={totals.doneLast30 - totals.createdLast30}
          tone={totals.doneLast30 - totals.createdLast30 < 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets.</p>
            ) : (
              byType.map((t) => (
                <div key={t.key} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0">{TICKET_TYPE_META[t.key as TicketType].label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(t.count / maxType) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-muted-foreground">{t.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as TicketPriority[]).map((p) => {
              const row = byPriority.find((r) => r.key === p);
              const meta = TICKET_PRIORITY_META[p];
              return (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs", meta.badge)}>{meta.label}</span>
                  <span className="tabular-nums text-muted-foreground">{row?.count ?? 0}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By project</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects.</p>
          ) : (
            <ul className="divide-y">
              {projects.map((p) => {
                const meta = PROJECT_STATUS_META[p.status as ProjectStatus];
                return (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <span className="font-mono text-xs text-muted-foreground">{p.key}</span> {p.name}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", meta.badge)}>{meta.label}</span>
                      <span className="w-16 text-right tabular-nums text-muted-foreground">
                        {p._count.tickets} total
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
