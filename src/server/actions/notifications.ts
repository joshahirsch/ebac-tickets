"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/tickets";

/** Mark a single notification read (scoped to the current user). */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  // updateMany with userId guard ensures a user can only touch their own rows.
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
  return { ok: true };
}

/** Mark every unread notification for the current user as read. */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
  return { ok: true };
}
