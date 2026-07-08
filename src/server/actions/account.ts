"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/tickets";

const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

/**
 * Change the *currently signed-in* user's own password. Uses the authenticated
 * Supabase client (updateUser acts on the session's user), so no admin key needed.
 */
export async function changeOwnPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
