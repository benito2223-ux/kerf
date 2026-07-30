import { createAccount } from "../actions";
import { accountTypeLabels, accountTypeValues } from "../../../../../lib/validation/account";

export default async function NouveauComptePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const action = createAccount.bind(null, tenantSlug);

  return (
    <main style={{ padding: 32, maxWidth: 460 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nouveau compte</h1>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nom du compte">
          <input name="name" required style={inputStyle} />
        </Field>

        <Field label="Type">
          <select name="type" required style={inputStyle} defaultValue="atelier">
            {accountTypeValues.map((value) => (
              <option key={value} value={value}>
                {accountTypeLabels[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Secteur">
          <input name="sector" style={inputStyle} placeholder="Sous-traitance aéronautique…" />
        </Field>

        <Field label="Téléphone">
          <input name="phone" style={inputStyle} />
        </Field>

        <Field label="Site web">
          <input name="website" type="url" style={inputStyle} placeholder="https://" />
        </Field>

        <button
          type="submit"
          style={{
            marginTop: 6,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Créer le compte
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  fontSize: 13.5,
  background: "var(--surface)",
  color: "var(--text)",
};
