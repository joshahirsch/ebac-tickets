import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role / secret key. Bypasses RLS,
 * so it must NEVER be imported into client components. Used for Storage
 * operations (upload, signed URLs, delete) where the app enforces its own
 * ticket/project permission checks before calling in.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Attachments require the Supabase secret/service-role key.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const ATTACHMENT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "ticket-attachments";
