import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the application User for the current Supabase auth session.
 *
 * Linking & bootstrap rules:
 *  - Match first by authId, then by email (to link pre-seeded users on first login).
 *  - On first login, write authId back so future lookups are by id.
 *  - If the signed-in email equals BOOTSTRAP_ADMIN_EMAIL and no ADMIN exists yet,
 *    promote this user to ADMIN. This is the "first admin" bootstrap.
 *  - Brand-new, unknown users are created as VIEWER (least privilege by default).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const email = authUser.email.toLowerCase();

  // 1) Try by authId.
  let user = await prisma.user.findUnique({ where: { authId: authUser.id } });

  // 2) Fall back to email (links a seeded/invited row to this auth identity).
  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.authId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { authId: authUser.id },
      });
    }
  }

  // 3) Bootstrap the first admin, or create an unknown user as VIEWER.
  if (!user) {
    const workspace = await prisma.workspace.findFirst();
    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
    const adminExists = (await prisma.user.count({ where: { role: "ADMIN" } })) > 0;
    const shouldBootstrapAdmin = bootstrapEmail === email && !adminExists;

    user = await prisma.user.create({
      data: {
        authId: authUser.id,
        email,
        name: (authUser.user_metadata?.name as string) ?? email.split("@")[0],
        role: shouldBootstrapAdmin ? "ADMIN" : "VIEWER",
        workspaceId: workspace?.id ?? null,
      },
    });
  } else if (
    // Late bootstrap: seeded admin@ row that logs in and still needs promotion.
    process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase() === email &&
    user.role !== "ADMIN" &&
    (await prisma.user.count({ where: { role: "ADMIN" } })) === 0
  ) {
    user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  if (!user.isActive) return null;
  return user;
}

/** Require an authenticated, active user or redirect to /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles or redirect to the dashboard. */
export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard?forbidden=1");
  return user;
}
