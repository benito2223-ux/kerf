import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "../../../../../lib/auth/guard";
import { withTenantScope } from "../../../../../lib/db/tenant-scope";
import { accounts, contacts, deals, interactions } from "../../../../../lib/db/schema";
import { interactionKindLabels } from "../../../../../lib/validation/interaction";
import { logContactInteraction } from "../actions";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireSession();

  const data = await withTenantScope(session, async (tx) => {
    const [contact] = await tx
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        roleTitle: contacts.roleTitle,
        email: contacts.email,
        phone: contacts.phone,
        mobile: contacts.mobile,
        isPrimary: contacts.isPrimary,
        accountId: contacts.accountId,
        accountName: accounts.name,
      })
      .from(contacts)
      .innerJoin(accounts, eq(contacts.accountId, accounts.id))
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) return null;

    const contactDeals = await tx
      .select({
        id: deals.id,
        title: deals.title,
        amount: deals.amount,
        status: deals.status,
      })
      .from(deals)
      .where(and(eq(deals.accountId, contact.accountId)))
      .orderBy(desc(deals.createdAt))
      .limit(20);

    const contactInteractions = await tx
      .select()
      .from(interactions)
      .where(and(eq(interactions.entity, "contact"), eq(interactions.entityId, contact.id)))
      .orderBy(desc(interactions.occurredAt))
      .limit(50);

    return { contact, deals: contactDeals, interactions: contactInteractions };
  });

  if (!data) notFound();
  const { contact } = data;
  const logInteractionWithTenant = logContactInteraction.bind(null, tenantSlug);

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
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            {contact.firstName} {contact.lastName}
            {contact.isPrimary && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "var(--accent-weak)",
                  borderRadius: 20,
                  padding: "2px 8px",
                }}
              >
                Contact principal
              </span>
            )}
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 2 }}>
            {contact.roleTitle ? `${contact.roleTitle} · ` : ""}
            <Link href={`/${tenantSlug}/comptes/${contact.accountId}`} style={{ color: "var(--accent)" }}>
              {contact.accountName}
            </Link>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", gap: 24 }}>
        {/* Colonne gauche : coordonnées */}
        <div style={{ width: 300, flex: "none" }}>
          <Section title="Coordonnées">
            <Field label="Email">
              {contact.email ? (
                <a href={`mailto:${contact.email}`} style={{ color: "var(--accent)" }}>
                  {contact.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Téléphone">
              <span className="num-mono">{contact.phone ?? "—"}</span>
            </Field>
            <Field label="Mobile">
              <span className="num-mono">{contact.mobile ?? "—"}</span>
            </Field>
          </Section>
        </div>

        {/* Colonne droite : interactions + deals du compte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Section title="Journal d'interactions">
            <form action={logInteractionWithTenant} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input type="hidden" name="contactId" value={contact.id} />
              <select name="kind" defaultValue="appel" style={inputStyle}>
                {Object.entries(interactionKindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="subject"
                placeholder="Objet (ex : relance devis, visite atelier…)"
                required
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" style={buttonStyle}>
                + Ajouter
              </button>
            </form>

            {data.interactions.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "12px 0" }}>
                Aucune interaction enregistrée avec ce contact pour l&apos;instant.
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {data.interactions.map((interaction) => (
                  <li
                    key={interaction.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "10px 12px",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: "var(--accent)",
                          background: "var(--accent-weak)",
                          borderRadius: 20,
                          padding: "1px 7px",
                        }}
                      >
                        {interactionKindLabels[interaction.kind]}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{interaction.subject}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }} className="num-mono">
                        {new Date(interaction.occurredAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {interaction.body && (
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5, whiteSpace: "pre-wrap" }}>
                        {interaction.body}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Deals du compte ${contact.accountName}`}>
            {data.deals.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "12px 0" }}>
                Aucun deal sur ce compte pour l&apos;instant.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {data.deals.map((deal) => (
                    <tr key={deal.id}>
                      <td style={tdStyle}>{deal.title}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }} className="num-mono">
                        {Number(deal.amount).toLocaleString("fr-FR")} €
                      </td>
                      <td style={{ ...tdStyle, width: 90 }}>
                        <DealStatusBadge status={deal.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "var(--faint)",
          margin: "0 0 10px 0",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--faint)", fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function DealStatusBadge({ status }: { status: "ouvert" | "gagne" | "perdu" }) {
  const config: Record<string, [string, string, string]> = {
    ouvert: ["var(--accent)", "var(--accent-weak)", "Ouvert"],
    gagne: ["var(--success)", "var(--success-weak)", "Gagné"],
    perdu: ["var(--danger)", "var(--danger-weak)", "Perdu"],
  };
  const [color, bg, label] = config[status]!;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, color, background: bg }}>
      {label}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  fontSize: 12.6,
  background: "var(--surface)",
  color: "var(--text)",
};
const buttonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  borderRadius: "var(--radius-sm)",
  padding: "6px 13px",
  fontSize: 12.8,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};
const tdStyle: React.CSSProperties = {
  padding: "9px 10px",
  borderBottom: "1px solid var(--border)",
};
