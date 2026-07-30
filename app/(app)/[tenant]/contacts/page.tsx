import Link from "next/link";
import { ilike, or, eq } from "drizzle-orm";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { accounts, contacts } from "../../../../lib/db/schema";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { q } = await searchParams;
  const session = await requireSession();

  const rows = await withTenantScope(session, (tx) => {
    const search = q?.trim();
    return tx
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        roleTitle: contacts.roleTitle,
        email: contacts.email,
        phone: contacts.phone,
        isPrimary: contacts.isPrimary,
        accountId: contacts.accountId,
        accountName: accounts.name,
      })
      .from(contacts)
      .innerJoin(accounts, eq(contacts.accountId, accounts.id))
      .where(
        search
          ? or(
              ilike(contacts.firstName, `%${search}%`),
              ilike(contacts.lastName, `%${search}%`),
              ilike(contacts.email, `%${search}%`),
              ilike(accounts.name, `%${search}%`),
            )
          : undefined,
      )
      .orderBy(contacts.lastName, contacts.firstName)
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
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Contacts</h1>
        <form style={{ marginLeft: 16 }}>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom, email ou compte…"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              fontSize: 12.6,
              width: 260,
              background: "var(--surface)",
              color: "var(--text)",
            }}
          />
        </form>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
          {rows.length} contacts
        </span>
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
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Compte</th>
              <th style={thStyle}>Fonction</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Téléphone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((contact) => (
              <tr key={contact.id}>
                <td style={tdStyle}>
                  <Link
                    href={`/${tenantSlug}/contacts/${contact.id}`}
                    style={{ fontWeight: 600, color: "var(--text)" }}
                  >
                    {contact.firstName} {contact.lastName}
                  </Link>
                  {contact.isPrimary && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--accent)",
                        background: "var(--accent-weak)",
                        borderRadius: 20,
                        padding: "1px 7px",
                      }}
                    >
                      Principal
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <Link
                    href={`/${tenantSlug}/comptes/${contact.accountId}`}
                    style={{ color: "var(--muted)" }}
                  >
                    {contact.accountName}
                  </Link>
                </td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{contact.roleTitle ?? "—"}</td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} style={{ color: "var(--accent)" }}>
                      {contact.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ ...tdStyle, color: "var(--muted)" }} className="num-mono">
                  {contact.phone ?? "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{ ...tdStyle, color: "var(--faint)", textAlign: "center", padding: 32 }}
                >
                  Aucun contact {q ? `pour « ${q} »` : "pour l'instant — ajoutez-en depuis une fiche compte"}.
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
