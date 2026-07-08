"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertCan, PermissionError } from "@/lib/rbac";
import { createProjectSchema, updateProjectSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/server/actions/tickets";

function guard<T>(fn: () => T): { ok: false; error: string } | null {
  try {
    fn();
    return null;
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createProjectAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const denied = guard(() => assertCan(user.role, "project:create"));
  if (denied) return denied;

  const parsed = createProjectSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    ownerId: formData.get("ownerId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid project." };
  }
  const input = parsed.data;

  const existing = await prisma.project.findFirst({
    where: { workspaceId: user.workspaceId ?? undefined, key: input.key },
    select: { id: true },
  });
  if (existing) return { ok: false, error: `Project key "${input.key}" is already in use.` };

  const project = await prisma.project.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      category: input.category,
      ownerId: input.ownerId ?? null,
      workspaceId: user.workspaceId!,
      members: input.ownerId ? { create: { userId: input.ownerId } } : undefined,
    },
  });

  revalidatePath("/settings/projects");
  revalidatePath("/projects");
  return { ok: true, id: project.id };
}

export async function updateProjectAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const denied = guard(() => assertCan(user.role, "project:update"));
  if (denied) return denied;

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  const data = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: data.id, workspaceId: user.workspaceId ?? undefined },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "Project not found." };

  await prisma.project.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
      ...(data.status === "ARCHIVED" ? { archivedAt: new Date() } : {}),
    },
  });

  revalidatePath("/settings/projects");
  revalidatePath("/projects");
  revalidatePath(`/projects/${data.id}`);
  return { ok: true, id: data.id };
}

export async function setProjectArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const denied = guard(() => assertCan(user.role, "project:archive"));
  if (denied) return denied;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: user.workspaceId ?? undefined },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "Project not found." };

  await prisma.project.update({
    where: { id },
    data: archived
      ? { status: "ARCHIVED", archivedAt: new Date() }
      : { status: "ACTIVE", archivedAt: null },
  });

  revalidatePath("/settings/projects");
  revalidatePath("/projects");
  return { ok: true, id };
}
