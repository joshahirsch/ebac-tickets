"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, assertCan, PermissionError } from "@/lib/rbac";
import { recordActivity } from "@/server/activity";
import { createSupabaseAdminClient, ATTACHMENT_BUCKET } from "@/lib/supabase/admin";
import type { ActionResult } from "@/server/actions/tickets";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

/** Upload a file to Supabase Storage and record its metadata on the ticket. */
export async function uploadAttachmentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertCan(user.role, "ticket:comment"); // members and above can attach
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const ticketId = String(formData.get("ticketId") ?? "");
  const file = formData.get("file");
  if (!ticketId) return { ok: false, error: "Missing ticket." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File exceeds the 10 MB limit." };

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!ticket || ticket.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Ticket not found." };
  }

  const storagePath = `tickets/${ticketId}/${randomUUID()}-${safeName(file.name)}`;
  const supabase = createSupabaseAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketAttachment.create({
      data: {
        ticketId,
        fileName: file.name.slice(0, 200),
        storagePath,
        mimeType: file.type || null,
        sizeBytes: file.size,
        uploaderId: user.id,
      },
    });
    await recordActivity({
      tx,
      ticketId,
      actorId: user.id,
      type: "ATTACHMENT_ADDED",
      message: `${user.name ?? user.email} attached ${file.name.slice(0, 80)}`,
    });
  });

  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true, id: ticketId };
}

/** Return a short-lived signed URL to view/download an attachment. */
export async function getAttachmentUrlAction(
  attachmentId: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const user = await requireUser();
  const att = await prisma.ticketAttachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: { include: { project: { select: { workspaceId: true } } } } },
  });
  if (!att || att.ticket.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Attachment not found." };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(att.storagePath, 60);
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create link." };
  return { ok: true, url: data.signedUrl };
}

/** Delete an attachment (uploader, or manager/admin) from storage + DB. */
export async function deleteAttachmentAction(attachmentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const att = await prisma.ticketAttachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: { include: { project: { select: { workspaceId: true } } } } },
  });
  if (!att || att.ticket.project.workspaceId !== user.workspaceId) {
    return { ok: false, error: "Attachment not found." };
  }
  const isOwner = att.uploaderId === user.id;
  if (!isOwner && !can(user.role, "ticket:archive")) {
    return { ok: false, error: "You can't delete this attachment." };
  }

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(ATTACHMENT_BUCKET).remove([att.storagePath]);
  await prisma.ticketAttachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/tickets/${att.ticketId}`);
  return { ok: true, id: att.ticketId };
}
