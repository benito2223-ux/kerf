import { redirect } from "next/navigation";
import { getSession } from "../lib/auth/session";
import { getTenantSlugById } from "../lib/db/queries";

/**
 * Racine du site — jamais un écran en soi, juste un aiguillage. Sans ça,
 * un lien nu vers le domaine tombe sur un vrai 404 (aucune page définie
 * pour "/").
 */
export default async function RootPage() {
  const session = await getSession();

  if (session?.tenantId) {
    const slug = await getTenantSlugById(session.tenantId);
    if (slug) redirect(`/${slug}`);
  }

  redirect(process.env.ENABLE_DEV_AUTH === "1" ? "/dev-connexion" : "/connexion");
}
