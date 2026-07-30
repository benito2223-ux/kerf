import Link from "next/link";
import { ilike } from "drizzle-orm";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { accounts } from "../../../../lib/db/schema";
import { accountStatusLabels, accountTypeLabels } from "../../../../lib/validation/account";

export default async function ComptesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { q } = await searchParams;
  const session = await requireSession();

  const rows = await withTenantScope(session, (tx) =>
    tx
      .select()
      .from(accounts)
      .where(q ? ilike(accounts.name, `%${q}%`) : undefined)
      .orderBy(accounts.name)
      .limit(100),
  );

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
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Comptes</h1>
        <form style={{ marginLeft: 16 }}>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher un compte…"
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
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>{rows.length} comptes</span>
        <Link
          href={`/${tenantSlug}/comptes/nouveau`}
          style={{
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            padding: "7px 13px",
            fontSize: 12.8,
            fontWeight: 600,
          }}
        >
          + Nouveau compte
        </Link>
        <Link
          href={`/${tenantSlug}/import?entity=comptes`}
          style={{
            background: "var(--canvas)",
            color: "var(--accent)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "7px 13px",
            fontSize: 12.8,
            fontWeight: 600,
          }}
        >
          Import Excel
        </Link>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--faint)", fontSize: 11, textTransform: "uppercase" }}>
              <th style={thStyle}>Compte</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Secteur</th>
              <th style={thStyle}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => (
              <tr key={account.id}>
                <td style={tdStyle}>
                  <Link
                    href={`/${tenantSlug}/comptes/${account.id}`}
                    style={{ fontWeight: 600, color: "var(--text)" }}
                  >
                    {account.name}
                  </Link>
                </td>
                <td style={tdStyle}>{accountTypeLabels[account.type]}</td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{account.sector ?? "—"}</td>
                <td style={tdStyle}>
                  <StatusBadge status={account.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...tdStyle, color: "var(--faint)", textAlign: "center", padding: 32 }}>
                  Aucun compte {q ? `pour « ${q} »` : "pour l'instant"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: "prospect" | "actif" | "dormant" }) {
  const colors: Record<string, [string, string]> = {
    actif: ["var(--success)", "var(--success-weak)"],
    dormant: ["var(--warn)", "var(--warn-weak)"],
    prospect: ["var(--accent)", "var(--accent-weak)"],
  };
  const [color, bg] = colors[status]!;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 20,
        color,
        background: bg,
      }}
    >
      {accountStatusLabels[status]}
    </span>
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
