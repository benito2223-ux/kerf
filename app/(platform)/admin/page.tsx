import { requirePlatformAdmin } from "../../../lib/auth/guard";
import { listTenants } from "../../../lib/db/queries";

/**
 * Console admin plateforme — réservée à platform_admin (ARCHITECTURE.md §3.6).
 * P0 : liste de lecture. L'éditeur de marque (couleur + logo, voir
 * mockups/kerf-mockup.html, écran 4) est prévu mais pas encore construit —
 * voir PROGRESS.md pour l'état réel avant de le supposer fait.
 */
export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const tenants = await listTenants();

  return (
    <main style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          background: "var(--accent-weak)",
          border: "1px solid var(--accent-weak-strong)",
          borderRadius: "var(--radius)",
          fontSize: 12.4,
          color: "var(--accent)",
          fontWeight: 600,
          marginBottom: 20,
        }}
      >
        🔒 Console admin plateforme — visible et modifiable par vous seul.
      </div>

      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tenants ({tenants.length})</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--faint)", fontSize: 11, textTransform: "uppercase" }}>
            <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Nom</th>
            <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Slug</th>
            <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Couleur d&apos;accent</th>
            <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Créé le</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                {tenant.name}
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                {tenant.slug}
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                {tenant.branding.accentHex ?? "— (défaut KERF)"}
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                {new Date(tenant.createdAt).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
