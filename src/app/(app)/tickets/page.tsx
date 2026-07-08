import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, canArchiveTickets } from "@/lib/rbac";
import { getTicketsList, type TicketListParams } from "@/server/queries/tickets";
import { getProjects, getAssignableUsers } from "@/server/queries/lookups";
import { TicketFilters } from "@/components/ticket/ticket-filters";
import { TicketTable } from "@/components/ticket/ticket-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function TicketsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const canArchive = canArchiveTickets(user.role);

  if (
    process.env.EBAC_ARCHIVE_DEBUG === "1" ||
    process.env.NODE_ENV !== "production" ||
    user.role === "ADMIN"
  ) {
    console.log("[tickets/page] archive debug", {
      email: user.email,
      role: user.role,
      canTicketArchive: can(user.role, "ticket:archive"),
      canArchiveTickets: canArchiveTickets(user.role),
      canArchiveProp: canArchive,
    });
  }

  // Resolve "me" for assignee filter.
  const assigneeId = searchParams.assigneeId === "me" ? user.id : searchParams.assigneeId;

  const params: TicketListParams = {
    q: searchParams.q,
    status: searchParams.status,
    priority: searchParams.priority,
    type: searchParams.type,
    projectId: searchParams.projectId,
    assigneeId,
    labelId: searchParams.labelId,
    quick: searchParams.quick,
    sort: searchParams.sort,
  };

  const [tickets, projects, users] = await Promise.all([
    getTicketsList(user.workspaceId, user.id, params),
    getProjects(user.workspaceId),
    getAssignableUsers(user.workspaceId),
  ]);

  const currentSort = searchParams.sort ?? "updatedAt:desc";
  const [curField, curDir] = currentSort.split(":");

  const sortHref = (field: string) => {
    const next = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "sort") next.set(k, v);
    });
    const dir = curField === field && curDir === "asc" ? "desc" : "asc";
    next.set("sort", `${field}:${dir}`);
    return `/tickets?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} shown</p>
          {process.env.EBAC_ARCHIVE_DEBUG === "1" || user.role === "ADMIN" ? (
            <p className="text-xs text-muted-foreground">
              Archive debug: role={user.role}, canArchive={String(canArchive)}
            </p>
          ) : null}
        </div>
        {can(user.role, "ticket:create") ? (
          <Button asChild size="sm">
            <Link href="/tickets/new">
              <Plus className="h-4 w-4" />
              New ticket
            </Link>
          </Button>
        ) : null}
      </div>

      <TicketFilters projects={projects} users={users} />

      <TicketTable
        tickets={tickets.map((t) => ({
          id: t.id,
          number: t.number,
          title: t.title,
          status: t.status,
          priority: t.priority,
          type: t.type,
          isArchived: t.isArchived,
          dueDate: t.dueDate?.toISOString() ?? null,
          updatedAt: t.updatedAt.toISOString(),
          project: t.project,
          assignee: t.assignee,
          labels: t.labels,
        }))}
        currentSort={currentSort}
        sortHref={sortHref}
        canArchive={canArchive}
        viewingArchived={searchParams.status === "ARCHIVED"}
      />
    </div>
  );
}
