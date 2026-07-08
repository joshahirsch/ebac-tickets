import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProjectDetail } from "@/server/queries/projects";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { TicketCard } from "@/components/ticket/ticket-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketListItem } from "@/server/queries/tickets";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const detail = await getProjectDetail(params.id, user.workspaceId);
  if (!detail) notFound();

  const { project, metrics, openTickets, doneTickets, blockedTickets, recentActivity } = detail;
  const meta = PROJECT_STATUS_META[project.status];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              <span className="text-muted-foreground">{project.key}</span> · {project.name}
            </h1>
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {project.description || "No description."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.category ?? "—"} · Owner: {project.owner ? (project.owner.name ?? project.owner.email) : "None"}
          </p>
        </div>
        {can(user.role, "ticket:create") ? (
          <Button asChild size="sm">
            <Link href={`/tickets/new?projectId=${project.id}`}>
              <Plus className="h-4 w-4" />
              New ticket
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open" value={metrics.total - metrics.done} />
        <StatCard label="Done" value={metrics.done} />
        <StatCard label="Blocked" value={metrics.blocked} tone={metrics.blocked > 0 ? "danger" : "default"} />
        <StatCard label="Progress %" value={metrics.progress} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Ticket buckets */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
                <TabsTrigger value="blocked">Blocked ({blockedTickets.length})</TabsTrigger>
                <TabsTrigger value="done">Completed ({doneTickets.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="pt-4">
                <TicketGrid tickets={openTickets} empty="No open tickets." />
              </TabsContent>
              <TabsContent value="blocked" className="pt-4">
                <TicketGrid tickets={blockedTickets} empty="Nothing blocked. 🎉" />
              </TabsContent>
              <TabsContent value="done" className="pt-4">
                <TicketGrid tickets={doneTickets} empty="No completed tickets yet." />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sidebar: team + activity */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team ({project.members.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members.</p>
              ) : (
                project.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                      {initials(m.user.name ?? m.user.email)}
                    </span>
                    <span className="flex-1 truncate">{m.user.name ?? m.user.email}</span>
                    <span className="text-xs text-muted-foreground">{m.user.role}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((a) => (
                    <li key={a.id} className="text-sm">
                      <Link href={`/tickets/${a.ticket.id}`} className="text-xs text-muted-foreground hover:underline">
                        {a.ticket.project.key}-{a.ticket.number}
                      </Link>
                      <p className="leading-snug">{a.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TicketGrid({ tickets, empty }: { tickets: TicketListItem[]; empty: string }) {
  if (tickets.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
    </div>
  );
}
