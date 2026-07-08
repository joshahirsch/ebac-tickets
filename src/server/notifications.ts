import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/constants";

/**
 * In-app notification helpers. Email delivery is intentionally NOT implemented
 * yet — `dispatch` is the single seam where an email/push provider will be
 * added later without touching call sites.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  tx?: Prisma.TransactionClient;
}) {
  // Never notify a null/empty user (e.g. unassigned ticket).
  if (!params.userId) return;
  const client = params.tx ?? prisma;
  const notification = await client.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });
  await dispatch(notification.id);
  return notification;
}

/**
 * Extension point for out-of-app delivery. No-op today. When email is enabled,
 * look up the notification + user preferences here and send.
 */
async function dispatch(_notificationId: string): Promise<void> {
  // TODO(email): integrate provider (Resend/SES) once in-app model is stable.
  return;
}

/**
 * Create DUE_SOON notifications for assignees of open tickets due within the
 * window. Deduplicates: skips a ticket if its assignee already got a DUE_SOON
 * notice for it in the last 20 hours. Returns the number created.
 *
 * Intended to be run on a schedule (see /api/cron/due-soon).
 */
export async function generateDueSoonNotifications(withinHours = 48): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinHours * 3600 * 1000);
  const dedupeSince = new Date(now.getTime() - 20 * 3600 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      isArchived: false,
      status: { in: OPEN_STATUSES },
      dueDate: { gte: now, lte: horizon },
      assigneeId: { not: null },
    },
    select: { id: true, title: true, assigneeId: true },
  });

  let created = 0;
  for (const t of tickets) {
    const userId = t.assigneeId!;
    const link = `/tickets/${t.id}`;
    const recent = await prisma.notification.count({
      where: { userId, type: "DUE_SOON", link, createdAt: { gte: dedupeSince } },
    });
    if (recent > 0) continue;
    await createNotification({
      userId,
      type: "DUE_SOON",
      title: `Due soon: ${t.title}`,
      link,
    });
    created++;
  }
  return created;
}

/** Extract @mentions (by email localpart or full email) from comment text. */
export function extractMentions(body: string): string[] {
  const matches = body.match(/@([a-zA-Z0-9._%+-]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?)/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}
