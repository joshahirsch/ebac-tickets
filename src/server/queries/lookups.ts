import "server-only";
import { prisma } from "@/lib/prisma";

/** Active projects in the workspace, for selectors and filters. */
export function getProjects(workspaceId: string | null) {
  return prisma.project.findMany({
    where: { workspaceId: workspaceId ?? undefined },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, key: true, name: true, status: true },
  });
}

/** Users who can be assigned tickets (active, non-viewer optional). */
export function getAssignableUsers(workspaceId: string | null) {
  return prisma.user.findMany({
    where: { workspaceId: workspaceId ?? undefined, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

export function getLabels(workspaceId: string | null) {
  return prisma.ticketLabel.findMany({
    where: { workspaceId: workspaceId ?? undefined },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
}
