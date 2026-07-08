import "server-only";
import type { Prisma, TicketStatus, TicketPriority, TicketType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/constants";

const DAY = 24 * 60 * 60 * 1000;

export type TicketListParams = {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  projectId?: string;
  assigneeId?: string; // "me" is resolved by the caller
  labelId?: string;
  quick?: string; // my | due-week | overdue | blocked | high | recent
  sort?: string; // e.g. "updatedAt:desc"
  includeArchived?: boolean;
};

const isEnum = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

const STATUSES: TicketStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE", "ARCHIVED"];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES: TicketType[] = ["TASK", "MILESTONE", "EVENT", "REQUEST", "MAINTENANCE", "OTHER"];

const SORT_FIELDS: Record<string, keyof Prisma.TicketOrderByWithRelationInput> = {
  updatedAt: "updatedAt",
  createdAt: "createdAt",
  dueDate: "dueDate",
  priority: "priority",
  status: "status",
  title: "title",
};

export function buildTicketWhere(
  workspaceId: string | null,
  params: TicketListParams,
  currentUserId: string,
): Prisma.TicketWhereInput {
  const now = new Date();
  const where: Prisma.TicketWhereInput = {
    project: { workspaceId: workspaceId ?? undefined },
  };
  const and: Prisma.TicketWhereInput[] = [];

  // Archived visibility: hidden unless explicitly filtering to ARCHIVED or asked.
  const statusFilter = isEnum(params.status, STATUSES);
  if (!params.includeArchived && statusFilter !== "ARCHIVED") {
    where.isArchived = false;
  }

  if (statusFilter) and.push({ status: statusFilter });
  const pri = isEnum(params.priority, PRIORITIES);
  if (pri) and.push({ priority: pri });
  const type = isEnum(params.type, TYPES);
  if (type) and.push({ type });
  if (params.projectId) and.push({ projectId: params.projectId });
  if (params.assigneeId) and.push({ assigneeId: params.assigneeId });
  if (params.labelId) and.push({ labels: { some: { labelId: params.labelId } } });

  if (params.q) {
    and.push({
      OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  switch (params.quick) {
    case "my":
      and.push({ assigneeId: currentUserId });
      break;
    case "due-week":
      and.push({ dueDate: { gte: now, lte: new Date(now.getTime() + 7 * DAY) }, status: { in: OPEN_STATUSES } });
      break;
    case "overdue":
      and.push({ dueDate: { lt: now }, status: { in: OPEN_STATUSES } });
      break;
    case "blocked":
      and.push({ status: "BLOCKED" });
      break;
    case "high":
      and.push({ priority: { in: ["HIGH", "URGENT"] }, status: { in: OPEN_STATUSES } });
      break;
    case "recent":
      and.push({ updatedAt: { gte: new Date(now.getTime() - 7 * DAY) } });
      break;
  }

  if (and.length) where.AND = and;
  return where;
}

export function parseSort(sort?: string): Prisma.TicketOrderByWithRelationInput {
  const [field, dir] = (sort ?? "updatedAt:desc").split(":");
  const key = SORT_FIELDS[field] ?? "updatedAt";
  const direction: Prisma.SortOrder = dir === "asc" ? "asc" : "desc";
  return { [key]: direction };
}

export async function getTicketsList(
  workspaceId: string | null,
  currentUserId: string,
  params: TicketListParams,
) {
  const where = buildTicketWhere(workspaceId, params, currentUserId);
  return prisma.ticket.findMany({
    where,
    orderBy: parseSort(params.sort),
    take: 200,
    include: {
      project: { select: { key: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      labels: { include: { label: { select: { id: true, name: true, color: true } } } },
    },
  });
}

export type TicketListItem = Awaited<ReturnType<typeof getTicketsList>>[number];

export async function getTicketById(id: string, workspaceId: string | null) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, project: { workspaceId: workspaceId ?? undefined } },
    include: {
      project: { select: { id: true, key: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      reporter: { select: { id: true, name: true, email: true } },
      labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { id: true, name: true, email: true } } },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: { uploader: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return ticket;
}

export type TicketDetail = NonNullable<Awaited<ReturnType<typeof getTicketById>>>;

/** Tickets for the "My Work" view: assigned to me + reported by me. */
export async function getMyWork(workspaceId: string | null, userId: string) {
  const include = {
    project: { select: { key: true, name: true } },
    assignee: { select: { id: true, name: true, email: true } },
    labels: { include: { label: { select: { id: true, name: true, color: true } } } },
  } as const;
  const scope = { project: { workspaceId: workspaceId ?? undefined }, isArchived: false };

  const [assigned, reported] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...scope, assigneeId: userId },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      include,
    }),
    prisma.ticket.findMany({
      where: { ...scope, reporterId: userId, NOT: { assigneeId: userId } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include,
    }),
  ]);

  return { assigned, reported };
}
