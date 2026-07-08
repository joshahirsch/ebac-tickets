"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertCan, can, PermissionError } from "@/lib/rbac";
import { recordActivity } from "@/server/activity";
import { createNotification, extractMentions } from "@/server/notifications";
import { addCommentSchema, updateCommentSchema } from "@/lib/validations/ticket";
import type { UpdateCommentInput } from "@/lib/validations/ticket";
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

/**
 * Update a comment body.
 * Allowed for the original author, or ADMIN/MANAGER (ticket:archive elevated manage).
 */
export async function updateCommentAction(input: UpdateCommentInput): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }
  const { commentId, body } = parsed.data;

  const comment = await prisma.ticketComment.findUnique({
    where: { id: commentId },
    include: {
      ticket: { include: { project: { select: { workspaceId: true } } } },
    },
  });
  if (!comment || comment.ticket.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Comment not found." };
  }

  const isAuthor = comment.authorId === user.id;
  if (!isAuthor && !can(user.role, "ticket:archive")) {
    return { ok: false, error: "You can't edit this comment." };
  }

  // Authors still need ticket:comment; elevated roles may edit via ticket:archive.
  if (isAuthor && !can(user.role, "ticket:comment")) {
    return { ok: false, error: "Not permitted: ticket:comment" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketComment.update({
      where: { id: commentId },
      data: { body, isEdited: true },
    });
    await recordActivity({
      tx,
      ticketId: comment.ticketId,
      actorId: user.id,
      type: "COMMENT_UPDATED",
      message: `${user.name ?? user.email} updated a comment`,
    });
  });

  revalidatePath(`/tickets/${comment.ticketId}`);
  return { ok: true, id: comment.ticketId };
}
