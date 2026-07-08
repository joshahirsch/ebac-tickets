import "server-only";
import { prisma } from "@/lib/prisma";

/** Recent notifications for a user, newest first. */
export function getNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number];
