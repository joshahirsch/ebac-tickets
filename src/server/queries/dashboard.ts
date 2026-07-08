import "server-only";
import type { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/constants";
import { dueThisWeekRange, overdueBefore } from "@/lib/date/date-only";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/**
 * Aggregates for the dashboard. Scopes to non-archived tickets. "Open" excludes
 * DONE and ARCHIVED. Assignee/status breakdowns are computed with groupBy for
 * efficiency, then joined to display names.
 */
export async function getDashboardData(workspaceId: string | null) {
  const dueSoonRange = dueThisWeekRange();
  const projectScope = workspaceId ? { project: { workspaceId } } : {};
  const openScope = { isArchived: false, status: { in: OPEN_STATUSES } };

  const [
    totalOpen,
    overdue,
    dueSoon,
    blocked,
    byStatusRaw,
    byAssigneeRaw,
    recentlyUpdated,
    dueSoonTickets,
  ] = await Promise.all([
    prisma.ticket.count({ where: { ...projectScope, ...openScope } }),
    prisma.ticket.count({
      where: { ...projectScope, ...openScope, dueDate: { lt: overdueBefore() } },
    }),
    prisma.ticket.count({
      where: { ...projectScope, ...openScope, dueDate: { gte: dueSoonRange.gte, lte: dueSoonRange.lte } },
    }),
    prisma.ticket.count({
      where: { ...projectScope, isArchived: false, status: "BLOCKED" },
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { ...projectScope, isArchived: false },
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["assigneeId"],
      where: { ...projectScope, ...openScope },
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: { ...projectScope, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { ...projectScope, ...openScope, dueDate: { gte: dueSoonRange.gte, lte: dueSoonRange.lte } },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: {
        project: { select: { key: true } },
        assignee: { select: { name: true, email: true } },
      },
    }),
  ]);

  // Resolve assignee names for the breakdown.
  const assigneeIds = byAssigneeRaw.map((r) => r.assigneeId).filter(Boolean) as string[];
  const assignees = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const assigneeMap = new Map(assignees.map((a) => [a.id, a.name ?? a.email]));

  const byStatus = byStatusRaw.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  const byAssignee = byAssigneeRaw
    .map((row) => ({
      name: row.assigneeId ? (assigneeMap.get(row.assigneeId) ?? "Unknown") : "Unassigned",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    counts: { totalOpen, overdue, dueSoon, blocked },
    byStatus: byStatus as Record<TicketStatus, number>,
    byAssignee,
    recentlyUpdated,
    dueSoonTickets,
  };
}
