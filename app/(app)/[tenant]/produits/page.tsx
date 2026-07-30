import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { products } from "../../../../lib/db/schema";

export default async function ProduitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string; family?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { q, family } = await searchParams;
  const session = await requireSession();

  const rows = await withTenantScope(session, (tx) => {
    const search = q?.trim();
    return tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        brand: products.brand,
        family: products.family,
        materialClass: products.materialClass,
        grade: products.grade,
        coating: products.coating,
        isActive: products.isActive,
        listPrice: products.listPrice,
      })
      .from(products)
      .where(
        search
          ? or(
              ilike(products.name, `%${search}%`),
              ilike(products.sku, `%${search}%`),
              ilike(products.brand, `%${search}%`),
            )
          : undefined,
      )
      .orderBy(desc(products.id))
      .limit(200);
  });

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Produits</h1>
        <form style={{ marginLeft: 16 }}>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher un produit…"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              fontSize: 12.6,
              width: 240,
              background: "var(--surface)",
              color: "var(--text)",
            }}
          />
        </form>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
          {rows.length} produits
        </span>
        <Link
          href={`/${tenantSlug}/produits/nouveau`}
          style={{
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            padding: "7px 13px",
            fontSize: 12.8,
            fontWeight: 600,
          }}
        >
          + Nouveau produit
        </Link>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "var(--faint)",
                fontSize: 11,
                textTransform: "uppercase",
              }}
            >
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Famille</th>
              <th style={thStyle}>Matière</th>
              <th style={thStyle}>Marque</th>
              <th style={thStyle}>Grade</th>
              <th style={thStyle}>Revêtement</th>
              <th style={thStyle}>Prix</th>
              <th style={thStyle}>Actif</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{p.sku}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                <td style={tdStyle}>{p.family}</td>
                <td style={tdStyle}>{p.materialClass}</td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{p.brand ?? "—"}</td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{p.grade ?? "—"}</td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{p.coating ?? "—"}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "var(--muted)" }} className="num-mono">
                  {p.listPrice != null ? `${Number(p.listPrice).toLocaleString("fr-FR")} €` : "—"}
                </td>
                <td style={tdStyle}>
                  {p.isActive ? (
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>Oui</span>
                  ) : (
                    <span style={{ color: "var(--faint)" }}>Non</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{ ...tdStyle, color: "var(--faint)", textAlign: "center", padding: 32 }}
                >
                  Aucun produit {q ? `pour « ${q} »` : "pour l'instant"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 600,
};
const tdStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderBottom: "1px solid var(--border)",
};