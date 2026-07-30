import { eq } from "drizzle-orm";
import { getDb } from "../../../lib/db/client";
import { memberships, tenants } from "../../../lib/db/schema";
import { devSignIn } from "./actions";

// Interroge la base à chaque requête — jamais de pré-génération statique
// au build (sinon Next essaie de se connecter à la base pendant `next build`).
export const dynamic = "force-dynamic";

/**
 * Connexion de test — voir lib/auth/dev-session.ts. Remplace l'écran
 * /connexion (Supabase) tant qu'aucun fournisseur d'auth réel n'est
 * branché sur la base de test (ARCHITECTURE.md, décision différée à la
 * fin du projet).
 */
export default async function DevConnexionPage() {
  if (process.env.ENABLE_DEV_AUTH !== "1") {
    return (
      <main style={{ padding: 40 }}>
        <p>Mode connexion de test désactivé.</p>
      </main>
    );
  }

  const db = getDb();
  const rows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      tenantName: tenants.name,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.isActive, true));

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas)",
      }}
    >
      <div
        style={{
          width: 380,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--warn)",
            background: "var(--warn-weak)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px",
          }}
        >
          Mode test local — aucune vérification de mot de passe.
        </div>

        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Connexion de test</h1>

        {rows.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
            Aucun utilisateur de test — lancez le script de seed d&apos;abord.
          </p>
        ) : (
          rows.map((row) => (
            <form key={row.userId} action={devSignIn}>
              <input type="hidden" name="userId" value={row.userId} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  background: "var(--canvas)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>{row.tenantName}</div>
                <div style={{ color: "var(--faint)", fontSize: 11.5 }}>{roleLabel(row.role)}</div>
              </button>
            </form>
          ))
        )}
      </div>
    </main>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "platform_admin":
      return "Admin plateforme";
    case "tenant_admin":
      return "Admin";
    case "sales":
      return "Commercial";
    default:
      return "Lecture seule";
  }
}
