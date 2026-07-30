import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase côté navigateur — écrans de connexion / acceptation d'invitation. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
