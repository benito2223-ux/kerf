import { createSupabaseServerClient } from "./supabase-server";
import { getDevSession } from "./dev-session";

export type AppRole = "platform_admin" | "tenant_admin" | "sales" | "viewer";

export interface AppSession {
  userId: string;
  email: string | null;
  tenantId: string | null;
  role: AppRole | null;
}

/**
 * Lit la session Supabase et en extrait tenant_id/role depuis app_metadata
 * du JWT — c'est la même donnée que lit la RLS côté base (ARCHITECTURE.md
 * §3.3), il ne doit jamais y avoir deux sources de vérité différentes.
 */
export async function getSession(): Promise<AppSession | null> {
  // Bascule de test locale (ENABLE_DEV_AUTH=1) — voir dev-session.ts.
  // Sans cette variable, getDevSession() renvoie toujours null et ce
  // chemin n'existe pas : aucun risque sur le vrai parcours Supabase.
  const dev = await getDevSession();
  if (dev) {
    return { userId: dev.userId, email: dev.email, tenantId: dev.tenantId, role: dev.role };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const appMetadata = user.app_metadata as { tenant_id?: string; role?: AppRole };

  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: appMetadata.tenant_id ?? null,
    role: appMetadata.role ?? null,
  };
}
