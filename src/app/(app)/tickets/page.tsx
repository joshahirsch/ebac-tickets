import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { toDateOnly } from "@/lib/date/date-only";
import { can, canArchiveTickets } from "@/lib/rbac";
import { parseTicketListSearchParams } from "@/lib/ticket-list-search-params";
import { getTicketsList } from "@/server/queries/tickets";
import { getProjects, getAssignableUsers } from "@/server/queries/lookups";
import { TicketFilters } from "@/components/ticket/ticket-filters";
import { TicketTable } from "@/components/ticket/ticket-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TicketsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const canArchive = canArchiveTickets(user.role);
  const sp = await searchParams;
  const { params, currentSort, viewingArchived } = parseTicketListSearchParams(sp, user.id);

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

  const [tickets, projects, users] = await Promise.all([
    getTicketsList(user.workspaceId, user.id, params),
    getProjects(user.workspaceId),
    getAssignableUsers(user.workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} shown</p>
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
          dueDate: toDateOnly(t.dueDate),
          updatedAt: t.updatedAt.toISOString(),
          project: t.project,
          assignee: t.assignee,
          labels: t.labels,
        }))}
        currentSort={currentSort}
        canArchive={canArchive}
        viewingArchived={viewingArchived}
      />
    </div>
  );
}
