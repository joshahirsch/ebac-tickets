"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertCan, PermissionError } from "@/lib/rbac";
import { recordActivity } from "@/server/activity";
import { createNotification } from "@/server/notifications";
import { humanize } from "@/lib/utils";
import {
  createTicketSchema,
  updateTicketSchema,
  type UpdateTicketInput,
} from "@/lib/validations/ticket";

export type ActionResult = { ok: boolean; error?: string; id?: string };

// --- Create -----------------------------------------------------------------

export async function createTicketAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:create");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = createTicketSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    projectId: formData.get("projectId"),
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
    type: formData.get("type") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    labelIds: formData.getAll("labelIds").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ticket." };
  }
  const input = parsed.data;

  // Ensure the project is in the user's workspace.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, workspaceId: user.workspaceId ?? undefined },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "Project not found in your workspace." };

  const ticket = await prisma.$transaction(async (tx) => {
    const { ticketSeq } = await tx.project.update({
      where: { id: project.id },
      data: { ticketSeq: { increment: 1 } },
      select: { ticketSeq: true },
    });

    const created = await tx.ticket.create({
      data: {
        number: ticketSeq,
        title: input.title,
        description: input.description,
        projectId: project.id,
        status: input.status,
        priority: input.priority,
        type: input.type,
        assigneeId: input.assigneeId ?? null,
        reporterId: user.id,
        dueDate: input.dueDate ?? null,
        labels: input.labelIds.length
          ? { create: input.labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
    });

    await recordActivity({
      tx,
      ticketId: created.id,
      actorId: user.id,
      type: "TICKET_CREATED",
      message: `${user.name ?? user.email} created this ticket`,
    });

    if (input.assigneeId && input.assigneeId !== user.id) {
      await createNotification({
        tx,
        userId: input.assigneeId,
        type: "TICKET_ASSIGNED",
        title: `You were assigned: ${input.title}`,
        link: `/tickets/${created.id}`,
      });
    }

    return created;
  });

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { ok: true, id: ticket.id };
}

// --- Update (partial, inline editors) ---------------------------------------

/**
 * Partial update used by the ticket detail inline editors. Diffs each changed
 * field, records a human-readable activity entry, and fires notifications for
 * assignment / status changes / blocked transitions.
 */
export async function updateTicketAction(input: UpdateTicketInput): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:update");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = updateTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  }
  const data = parsed.data;

  const existing = await prisma.ticket.findUnique({
    where: { id: data.id },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!existing || existing.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Ticket not found." };
  }

  const updates: Prisma.TicketUpdateInput = {};
  const activities: Array<Parameters<typeof recordActivity>[0]> = [];
  const actor = user.name ?? user.email;

  if (data.title !== undefined && data.title !== existing.title) {
    updates.title = data.title;
    activities.push({
      ticketId: existing.id,
      actorId: user.id,
      type: "TITLE_CHANGED",
      message: `${actor} updated the title`,
      fromValue: existing.title,
      toValue: data.title,
    });
  }

  if (data.description !== undefined && data.description !== (existing.description ?? "")) {
    updates.description = data.description;
    activities.push({
      ticketId: existing.id,
      actorId: user.id,
      type: "DESCRIPTION_CHANGED",
      message: `${actor} edited the description`,
    });
  }

  if (data.status !== undefined && data.status !== existing.status) {
    updates.status = data.status;
    // Keep the archive flag consistent with the ARCHIVED status.
    if (data.status === "ARCHIVED") {
      updates.isArchived = true;
      updates.archivedAt = new Date();
    } else if (existing.isArchived) {
      updates.isArchived = false;
      updates.archivedAt = null;
    }
    activities.push({
      ticketId: existing.id,
      actorId: user.id,
      type: "STATUS_CHANGED",
      message: `${actor} changed status from ${humanize(existing.status)} to ${humanize(data.status)}`,
      fromValue: existing.status,
      toValue: data.status,
    });
  }

  if (data.priority !== undefined && data.priority !== existing.priority) {
    updates.priority = data.priority;
    activities.push({
      ticketId: existing.id,
      actorId: user.id,
      type: "PRIORITY_CHANGED",
      message: `${actor} changed priority from ${humanize(existing.priority)} to ${humanize(data.priority)}`,
      fromValue: existing.priority,
      toValue: data.priority,
    });
  }

  if (data.type !== undefined && data.type !== existing.type) {
    updates.type = data.type;
    activities.push({
      ticketId: existing.id,
      actorId: user.id,
      type: "TYPE_CHANGED",
      message: `${actor} changed type from ${humanize(existing.type)} to ${humanize(data.type)}`,
      fromValue: existing.type,
      toValue: data.type,
    });
  }

  if (data.assigneeId !== undefined && (data.assigneeId ?? null) !== existing.assigneeId) {
    updates.assignee = data.assigneeId
      ? { connect: { id: data.assigneeId } }
      : { disconnect: true };
    activities.push({
      ticketId: existing.id,
      actorId: user.id,
      type: "ASSIGNEE_CHANGED",
      message: data.assigneeId ? `${actor} reassigned this ticket` : `${actor} unassigned this ticket`,
      fromValue: existing.assigneeId,
      toValue: data.assigneeId ?? null,
    });
  }

  if (data.dueDate !== undefined) {
    const newDue = data.dueDate ? data.dueDate.toISOString() : null;
    const oldDue = existing.dueDate ? existing.dueDate.toISOString() : null;
    if (newDue !== oldDue) {
      updates.dueDate = data.dueDate ?? null;
      activities.push({
        ticketId: existing.id,
        actorId: user.id,
        type: "DUE_DATE_CHANGED",
        message: `${actor} ${newDue ? "set" : "cleared"} the due date`,
        fromValue: oldDue,
        toValue: newDue,
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, id: existing.id }; // nothing changed
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: existing.id }, data: updates });
    for (const a of activities) await recordActivity({ ...a, tx });

    // Notifications
    const notifyAssignee = existing.assigneeId ?? data.assigneeId ?? null;
    if (data.assigneeId && data.assigneeId !== user.id && data.assigneeId !== existing.assigneeId) {
      await createNotification({
        tx,
        userId: data.assigneeId,
        type: "TICKET_ASSIGNED",
        title: `You were assigned: ${existing.title}`,
        link: `/tickets/${existing.id}`,
      });
    }
    if (data.status && data.status !== existing.status && notifyAssignee && notifyAssignee !== user.id) {
      await createNotification({
        tx,
        userId: notifyAssignee,
        type: data.status === "BLOCKED" ? "TICKET_BLOCKED" : "STATUS_CHANGED",
        title:
          data.status === "BLOCKED"
            ? `Ticket blocked: ${existing.title}`
            : `Status → ${humanize(data.status)}: ${existing.title}`,
        link: `/tickets/${existing.id}`,
      });
    }
  });

  revalidatePath(`/tickets/${existing.id}`);
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { ok: true, id: existing.id };
}

// --- Archive / reopen -------------------------------------------------------

type ArchiveActor = { id: string; name: string | null; email: string };

async function archiveTicketInTx(tx: Prisma.TransactionClient, ticketId: string, actor: ArchiveActor) {
  await tx.ticket.update({
    where: { id: ticketId },
    data: { isArchived: true, archivedAt: new Date(), status: "ARCHIVED" },
  });
  await recordActivity({
    tx,
    ticketId,
    actorId: actor.id,
    type: "TICKET_ARCHIVED",
    message: `${actor.name ?? actor.email} archived this ticket`,
  });
}

export type BulkArchiveResult = ActionResult & { archivedCount?: number; skippedCount?: number };

export async function archiveTicketAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:archive");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const existing = await prisma.ticket.findUnique({
    where: { id },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!existing || existing.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Ticket not found." };
  }
  if (existing.isArchived) {
    return { ok: true, id };
  }

  await prisma.$transaction(async (tx) => {
    await archiveTicketInTx(tx, id, user);
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { ok: true, id };
}

export async function bulkArchiveTicketsAction(ids: string[]): Promise<BulkArchiveResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:archive");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, error: "No tickets selected." };
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      id: { in: uniqueIds },
      project: { workspaceId: user.workspaceId ?? undefined },
      isArchived: false,
    },
    select: { id: true },
  });

  if (tickets.length === 0) {
    return { ok: false, error: "No archivable tickets found." };
  }

  await prisma.$transaction(async (tx) => {
    for (const ticket of tickets) {
      await archiveTicketInTx(tx, ticket.id, user);
    }
  });

  for (const ticket of tickets) {
    revalidatePath(`/tickets/${ticket.id}`);
  }
  revalidatePath("/tickets");

  return {
    ok: true,
    archivedCount: tickets.length,
    skippedCount: uniqueIds.length - tickets.length,
  };
}

export async function reopenTicketAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:archive");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const existing = await prisma.ticket.findUnique({
    where: { id },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!existing || existing.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Ticket not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: { isArchived: false, archivedAt: null, status: "TODO" },
    });
    await recordActivity({
      tx,
      ticketId: id,
      actorId: user.id,
      type: "TICKET_REOPENED",
      message: `${user.name ?? user.email} reopened this ticket`,
    });
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { ok: true, id };
}

/** Form wrapper used by the "New ticket" page — redirects on success. */
export async function createTicketAndRedirect(
  prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const result = await createTicketAction(prev, formData);
  if (result.ok && result.id) redirect(`/tickets/${result.id}`);
  return result;
}
