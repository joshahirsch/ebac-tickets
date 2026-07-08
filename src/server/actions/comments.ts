"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertCan, PermissionError } from "@/lib/rbac";
import { recordActivity } from "@/server/activity";
import { createNotification, extractMentions } from "@/server/notifications";
import { addCommentSchema } from "@/lib/validations/ticket";
import type { ActionResult } from "@/server/actions/tickets";

export async function addCommentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:comment");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = addCommentSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }
  const { ticketId, body } = parsed.data;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!ticket || ticket.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Ticket not found." };
  }

  // Resolve @mentions to users in the same workspace.
  const mentionTokens = extractMentions(body);
  const mentioned = mentionTokens.length
    ? await prisma.user.findMany({
        where: {
          workspaceId: user.workspaceId ?? undefined,
          OR: [
            { email: { in: mentionTokens } },
            ...mentionTokens.map((t) => ({ email: { startsWith: `${t}@` } })),
          ],
        },
        select: { id: true },
      })
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.ticketComment.create({
      data: { ticketId, body, authorId: user.id },
    });
    await recordActivity({
      tx,
      ticketId,
      actorId: user.id,
      type: "COMMENT_ADDED",
      message: `${user.name ?? user.email} added a comment`,
    });

    const notified = new Set<string>();
    for (const m of mentioned) {
      if (m.id !== user.id && !notified.has(m.id)) {
        notified.add(m.id);
        await createNotification({
          tx,
          userId: m.id,
          type: "MENTIONED",
          title: `${user.name ?? user.email} mentioned you`,
          body: body.slice(0, 140),
          link: `/tickets/${ticketId}`,
        });
      }
    }
  });

  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true, id: ticketId };
}
