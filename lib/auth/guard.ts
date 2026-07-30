import { redirect } from "next/navigation";
import { getSession, type AppRole, type AppSession } from "./session";

/**
 * Garde de rôle réutilisable dans les Server Components, Server Actions et
 * Route Handlers. La RLS empêche déjà toute fuite de données ; cette garde
 * protège l'expérience utilisateur (éviter d'afficher un écran interdit)
 * et sert de seconde ligne de défense explicite, pas la première.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
}

export async function requireRole(allowed: AppRole[]): Promise<AppSession> {
  const session = await requireSession();
  if (!session.role || !allowed.includes(session.role)) {
    redirect("/acces-refuse");
  }
  return session;
}

/** Réservé à la console admin plateforme — jamais accessible à un tenant. */
export async function requirePlatformAdmin(): Promise<AppSession> {
  return requireRole(["platform_admin"]);
}

/**
 * Vérifie que le tenant présent dans l'URL correspond au tenant de
 * l'utilisateur connecté. Défense en profondeur : un commercial ne doit
 * même pas pouvoir *afficher* l'URL d'un autre tenant, RLS ou pas.
 */
export async function requireTenantMatch(tenantSlugFromUrl: string, resolveTenantId: (slug: string) => Promise<string | null>) {
  const session = await requireSession();
  if (session.role === "platform_admin") return session;

  const tenantId = await resolveTenantId(tenantSlugFromUrl);
  if (!tenantId || tenantId !== session.tenantId) {
    redirect("/acces-refuse");
  }
  return session;
}
