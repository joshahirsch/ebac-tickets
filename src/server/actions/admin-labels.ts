"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertCan, PermissionError } from "@/lib/rbac";
import { labelSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/server/actions/tickets";

function denyIfForbidden(role: Parameters<typeof assertCan>[0]) {
  try {
    assertCan(role, "label:manage");
    return null;
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false as const, error: e.message };
    throw e;
  }
}

export async function createLabelAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const denied = denyIfForbidden(user.role);
  if (denied) return denied;

  const parsed = labelSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid label." };

  const exists = await prisma.ticketLabel.findFirst({
    where: { workspaceId: user.workspaceId ?? undefined, name: parsed.data.name },
    select: { id: true },
  });
  if (exists) return { ok: false, error: `Label "${parsed.data.name}" already exists.` };

  await prisma.ticketLabel.create({
    data: { name: parsed.data.name, color: parsed.data.color, workspaceId: user.workspaceId! },
  });
  revalidatePath("/settings/labels");
  return { ok: true };
}

export async function updateLabelAction(id: string, name: string, color: string): Promise<ActionResult> {
  const user = await requireUser();
  const denied = denyIfForbidden(user.role);
  if (denied) return denied;

  const parsed = labelSchema.safeParse({ name, color });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid label." };

  const label = await prisma.ticketLabel.findFirst({
    where: { id, workspaceId: user.workspaceId ?? undefined },
    select: { id: true },
  });
  if (!label) return { ok: false, error: "Label not found." };

  await prisma.ticketLabel.update({
    where: { id },
    data: { name: parsed.data.name, color: parsed.data.color },
  });
  revalidatePath("/settings/labels");
  return { ok: true };
}

export async function deleteLabelAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const denied = denyIfForbidden(user.role);
  if (denied) return denied;

  const label = await prisma.ticketLabel.findFirst({
    where: { id, workspaceId: user.workspaceId ?? undefined },
    select: { id: true },
  });
  if (!label) return { ok: false, error: "Label not found." };

  // Cascade removes the ticket/label join rows; tickets themselves are untouched.
  await prisma.ticketLabel.delete({ where: { id } });
  revalidatePath("/settings/labels");
  return { ok: true };
}
