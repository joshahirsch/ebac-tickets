import "server-only";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/constants";

/** All users in the workspace with a count of open tickets assigned to them. */
export async function getAllUsers(workspaceId: string | null) {
  const users = await prisma.user.findMany({
    where: { workspaceId: workspaceId ?? undefined },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, authId: true, createdAt: true },
  });

  const counts = await prisma.ticket.groupBy({
    by: ["assigneeId"],
    where: { project: { workspaceId: workspaceId ?? undefined }, isArchived: false, status: { in: OPEN_STATUSES } },
    _count: { _all: true },
  });
  const map = new Map(counts.map((c) => [c.assigneeId, c._count._all]));

  return users.map((u) => ({ ...u, openTickets: map.get(u.id) ?? 0 }));
}

/** Labels with a usage count (how many tickets carry each). */
export async function getLabelsWithUsage(workspaceId: string | null) {
  const labels = await prisma.ticketLabel.findMany({
    where: { workspaceId: workspaceId ?? undefined },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, _count: { select: { tickets: true } } },
  });
  return labels;
}

/** Basic reporting metrics for the workspace. */
export async function getReportMetrics(workspaceId: string | null) {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const scope = { project: { workspaceId: workspaceId ?? undefined } };

  const [total, open, done, blocked, overdue, createdLast30, doneLast30, byType, byPriority, projects] =
    await Promise.all([
      prisma.ticket.count({ where: { ...scope, isArchived: false } }),
      prisma.ticket.count({ where: { ...scope, isArchived: false, status: { in: OPEN_STATUSES } } }),
      prisma.ticket.count({ where: { ...scope, status: "DONE" } }),
      prisma.ticket.count({ where: { ...scope, isArchived: false, status: "BLOCKED" } }),
      prisma.ticket.count({
        where: { ...scope, isArchived: false, status: { in: OPEN_STATUSES }, dueDate: { lt: now } },
      }),
      prisma.ticket.count({ where: { ...scope, createdAt: { gte: monthAgo } } }),
      prisma.ticket.count({ where: { ...scope, status: "DONE", updatedAt: { gte: monthAgo } } }),
      prisma.ticket.groupBy({ by: ["type"], where: { ...scope, isArchived: false }, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["priority"], where: { ...scope, isArchived: false }, _count: { _all: true } }),
      prisma.project.findMany({
        where: { workspaceId: workspaceId ?? undefined },
        select: { id: true, key: true, name: true, status: true, _count: { select: { tickets: true } } },
        orderBy: { name: "asc" },
      }),
    ]);

  return {
    totals: { total, open, done, blocked, overdue, createdLast30, doneLast30 },
    byType: byType.map((r) => ({ key: r.type, count: r._count._all })).sort((a, b) => b.count - a.count),
    byPriority: byPriority.map((r) => ({ key: r.priority, count: r._count._all })),
    projects,
  };
}
