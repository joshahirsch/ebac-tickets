import "server-only";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/constants";

/** Projects in the workspace with lightweight ticket rollups for the list view. */
export async function getProjectsWithCounts(workspaceId: string | null) {
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspaceId ?? undefined },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tickets: true, members: true } },
    },
  });

  // Open / done counts per project in two grouped queries.
  const [openGroups, doneGroups] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["projectId"],
      where: { project: { workspaceId: workspaceId ?? undefined }, isArchived: false, status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["projectId"],
      where: { project: { workspaceId: workspaceId ?? undefined }, status: "DONE" },
      _count: { _all: true },
    }),
  ]);
  const openMap = new Map(openGroups.map((g) => [g.projectId, g._count._all]));
  const doneMap = new Map(doneGroups.map((g) => [g.projectId, g._count._all]));

  return projects.map((p) => ({
    ...p,
    openCount: openMap.get(p.id) ?? 0,
    doneCount: doneMap.get(p.id) ?? 0,
  }));
}

/** Full project detail: metrics, ticket buckets, members, and recent activity. */
export async function getProjectDetail(id: string, workspaceId: string | null) {
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspaceId ?? undefined },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
  if (!project) return null;

  const ticketInclude = {
    project: { select: { key: true, name: true } },
    assignee: { select: { id: true, name: true, email: true } },
    labels: { include: { label: { select: { id: true, name: true, color: true } } } },
  } as const;

  const [byStatusRaw, openTickets, doneTickets, blockedTickets, recentActivity, totalCount] =
    await Promise.all([
      prisma.ticket.groupBy({
        by: ["status"],
        where: { projectId: id, isArchived: false },
        _count: { _all: true },
      }),
      prisma.ticket.findMany({
        where: { projectId: id, isArchived: false, status: { in: OPEN_STATUSES } },
        orderBy: { updatedAt: "desc" },
        take: 25,
        include: ticketInclude,
      }),
      prisma.ticket.findMany({
        where: { projectId: id, status: "DONE" },
        orderBy: { updatedAt: "desc" },
        take: 15,
        include: ticketInclude,
      }),
      prisma.ticket.findMany({
        where: { projectId: id, isArchived: false, status: "BLOCKED" },
        orderBy: { updatedAt: "desc" },
        take: 15,
        include: ticketInclude,
      }),
      prisma.ticketActivity.findMany({
        where: { ticket: { projectId: id } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          actor: { select: { name: true, email: true } },
          ticket: { select: { id: true, number: true, title: true, project: { select: { key: true } } } },
        },
      }),
      prisma.ticket.count({ where: { projectId: id, isArchived: false } }),
    ]);

  const byStatus = byStatusRaw.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = r._count._all;
    return acc;
  }, {});
  const done = byStatus.DONE ?? 0;
  const progress = totalCount > 0 ? Math.round((done / totalCount) * 100) : 0;

  return {
    project,
    metrics: { total: totalCount, done, progress, blocked: byStatus.BLOCKED ?? 0, byStatus },
    openTickets,
    doneTickets,
    blockedTickets,
    recentActivity,
  };
}
