import { requireUser } from "@/lib/auth";
import { getMyWork, type TicketListItem } from "@/server/queries/tickets";
import { OPEN_STATUSES, TICKET_STATUS_META } from "@/lib/constants";
import type { TicketStatus } from "@prisma/client";
import { TicketCard } from "@/components/ticket/ticket-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COLUMNS: TicketStatus[] = OPEN_STATUSES;

export default async function MyWorkPage() {
  const user = await requireUser();
  const { assigned, reported } = await getMyWork(user.workspaceId, user.id);

  const grouped = Object.fromEntries(COLUMNS.map((c) => [c, [] as TicketListItem[]])) as Record<
    TicketStatus,
    TicketListItem[]
  >;
  for (const t of assigned) if (grouped[t.status]) grouped[t.status].push(t);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Work</h1>
        <p className="text-sm text-muted-foreground">
          {assigned.length} assigned to you · {reported.length} reported by you
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Assigned to me</h2>
        {assigned.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nothing assigned to you right now.
          </div>
        ) : (
          <div className="space-y-4">
            {COLUMNS.filter((s) => grouped[s].length > 0).map((status) => {
              const meta = TICKET_STATUS_META[status];
              return (
                <div key={status}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped[status].map((t) => (
                      <TicketCard key={t.id} ticket={t} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Reported by me</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Open tickets I created</CardTitle>
          </CardHeader>
          <CardContent>
            {reported.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No open tickets reported by you.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reported.map((t) => (
                  <TicketCard key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
