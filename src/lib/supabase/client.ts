import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for use in Client Components (browser). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Accept either the legacy anon key name or the new publishable key name.
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
  );
}
