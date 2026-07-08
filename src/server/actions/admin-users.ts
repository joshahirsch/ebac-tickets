"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, setPasswordSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/server/actions/tickets";

/**
 * Create a new team member: provisions a Supabase Auth identity (email + password,
 * pre-confirmed) via the admin API, then creates/links the application User row.
 * ADMIN only.
 */
export async function createUserAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    role: formData.get("role") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, name, role, password } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (error || !data?.user) {
    return { ok: false, error: error?.message ?? "Could not create the auth user." };
  }

  // Create or link the application row (email may already exist from a seed).
  await prisma.user.upsert({
    where: { email },
    update: { authId: data.user.id, name: name ?? undefined, role, isActive: true, workspaceId: admin.workspaceId },
    create: {
      authId: data.user.id,
      email,
      name: name ?? email.split("@")[0],
      role,
      isActive: true,
      workspaceId: admin.workspaceId,
    },
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

/** Change a user's role. Guards against removing the last remaining admin. */
export async function updateUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = createUserSchema.shape.role.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Invalid role." };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };

  if (target.role === "ADMIN" && parsed.data !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (adminCount <= 1) return { ok: false, error: "You can't remove the last admin." };
  }

  await prisma.user.update({ where: { id: userId }, data: { role: parsed.data } });
  revalidatePath("/settings/users");
  return { ok: true };
}

/** Admin-set another user's password via the Supabase admin API. */
export async function adminSetUserPasswordAction(
  userId: string,
  password: string,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = setPasswordSchema.safeParse({ userId, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { authId: true },
  });
  if (!target) return { ok: false, error: "User not found." };
  if (!target.authId) {
    return { ok: false, error: "This user hasn't signed in yet, so there's no login to update." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(target.authId, {
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Activate or deactivate a user. Deactivating blocks their access immediately. */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (userId === admin.id && !isActive) {
    return { ok: false, error: "You can't deactivate your own account." };
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };

  if (target.role === "ADMIN" && !isActive) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (adminCount <= 1) return { ok: false, error: "You can't deactivate the last admin." };
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/settings/users");
  return { ok: true };
}
