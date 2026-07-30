import { eq, desc } from "drizzle-orm";
import { requireSession } from "../../../../../lib/auth/guard";
import { withTenantScope } from "../../../../../lib/db/tenant-scope";
import { customFieldDefs } from "../../../../../lib/db/schema";

export default async function CustomFieldsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const session = await requireSession();

  const defs = await withTenantScope(session, (tx) =>
    tx
      .select()
      .from(customFieldDefs)
      .where(eq(customFieldDefs.tenantId, session.tenantId!))
      .orderBy(desc(customFieldDefs.position)),
  );

  return (
    <main style={{ padding: 32, maxWidth: 700 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Champs custom</h1>
      <p style={{ fontSize: 12.5, color: "var(--faint)", marginBottom: 20 }}>
        Ajoutez des champs supplémentaires sur les entités CRM. Les données sont stockées dans le champ{" "}
        <code className="num-mono">custom jsonb</code> de chaque enregistrement.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600 }}>Définir un nouveau champ</h2>
        <form
          action={async (fd) => {
            "use server";
            const { createCustomFieldDef } = await import("./actions");
            await createCustomFieldDef(tenantSlug, fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Entité
              <select name="entity" required style={inputStyle}>
                <option value="account">Comptes</option>
                <option value="contact">Contacts</option>
                <option value="deal">Deals</option>
                <option value="product">Produits</option>
                <option value="trial">Essais</option>
              </select>
            </label>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Clé
              <input name="key" required placeholder="ex: secteur" style={inputStyle} />
            </label>
            <label style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Label
              <input name="label" required placeholder="ex: Secteur d activité" style={inputStyle} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Type
              <select name="type" required style={inputStyle}>
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="select">Liste déroulante</option>
                <option value="boolean">Booléen</option>
                <option value="date">Date</option>
              </select>
            </label>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Options (select uniquement, séparées par des virgules)
              <input name="options" placeholder="Option 1, Option 2" style={inputStyle} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, paddingBottom: 6 }}>
              <input type="checkbox" name="required" /> Requis
            </label>
            <button type="submit" style={buttonStyle}>Ajouter</button>
          </div>
        </form>
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        Champs définis ({defs.length})
      </h2>
      {defs.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--faint)", padding: "12px 0" }}>
          Aucun champ custom défini pour l&apos;instant.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--faint)", fontSize: 11, textTransform: "uppercase" }}>
              <th style={thStyle}>Entité</th>
              <th style={thStyle}>Clé</th>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Requis</th>
              <th style={thStyle}>Supprimer</th>
            </tr>
          </thead>
          {defs.map((def) => (
            <tr key={def.id}>
              <td style={tdStyle}>{def.entity}</td>
              <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{def.key}</td>
              <td style={tdStyle}>{def.label}</td>
              <td style={tdStyle}>{def.type}</td>
              <td style={tdStyle}>{def.required ? "Oui" : "—"}</td>
              <td style={tdStyle}>
                <form
                  action={async () => {
                    "use server";
                    const fd = new FormData();
                    fd.append("defId", def.id);
                    const { deleteCustomFieldDef } = await import("./actions");
                    await deleteCustomFieldDef(tenantSlug, fd);
                  }}
                >
                  <button type="submit" style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 12.5, padding: "4px 8px" }}>
                    Supprimer
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </table>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  fontSize: 12.5,
  background: "var(--surface)",
  color: "var(--text)",
};
const buttonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "7px 14px",
  fontSize: 12.8,
  fontWeight: 600,
  cursor: "pointer",
};
const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 600,
};
const tdStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderBottom: "1px solid var(--border)",
};
