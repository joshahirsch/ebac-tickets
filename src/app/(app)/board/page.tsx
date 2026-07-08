import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getTicketsList, type TicketListParams } from "@/server/queries/tickets";
import { getProjects, getAssignableUsers } from "@/server/queries/lookups";
import { TicketFilters } from "@/components/ticket/ticket-filters";
import { KanbanBoard } from "@/components/board/kanban-board";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function BoardPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const assigneeId = searchParams.assigneeId === "me" ? user.id : searchParams.assigneeId;

  const params: TicketListParams = {
    q: searchParams.q,
    priority: searchParams.priority,
    type: searchParams.type,
    projectId: searchParams.projectId,
    assigneeId,
    labelId: searchParams.labelId,
    quick: searchParams.quick,
    // Board provides its own status columns, so status filter is ignored here.
  };

  const [tickets, projects, users] = await Promise.all([
    getTicketsList(user.workspaceId, user.id, params),
    getProjects(user.workspaceId),
    getAssignableUsers(user.workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Board</h1>
        <p className="text-sm text-muted-foreground">{tickets.length} tickets</p>
      </div>

      <TicketFilters projects={projects} users={users} />

      <KanbanBoard tickets={tickets} canEdit={can(user.role, "ticket:update")} />
    </div>
  );
}
