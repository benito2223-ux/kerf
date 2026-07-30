import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "../../../../../lib/auth/guard";
import { withTenantScope } from "../../../../../lib/db/tenant-scope";
import { accounts, contacts, interactions } from "../../../../../lib/db/schema";
import { accountStatusLabels, accountTypeLabels } from "../../../../../lib/validation/account";
import { interactionKindLabels, interactionKindValues } from "../../../../../lib/validation/interaction";
import { createContact, logInteraction } from "../actions";

export default async function CompteDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireSession();

  const data = await withTenantScope(session, async (tx) => {
    const [account] = await tx.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) return null;

    const accountContacts = await tx.select().from(contacts).where(eq(contacts.accountId, id));
    const accountInteractions = await tx
      .select()
      .from(interactions)
      .where(and(eq(interactions.entity, "account"), eq(interactions.entityId, id)))
      .orderBy(desc(interactions.occurredAt));

    return { account, contacts: accountContacts, interactions: accountInteractions };
  });

  if (!data) notFound();
  const { account, contacts: accountContacts, interactions: accountInteractions } = data;

  const createContactWithIds = createContact.bind(null, tenantSlug);
  const logInteractionWithIds = logInteraction.bind(null, tenantSlug);

  return (
    <main style={{ padding: 32, display: "flex", gap: 32, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{account.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
          {accountTypeLabels[account.type]} · {accountStatusLabels[account.status]}
          {account.sector ? ` · ${account.sector}` : ""}
        </p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>Contacts ({accountContacts.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {accountContacts.map((contact) => (
              <div key={contact.id} style={cardStyle}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {contact.firstName} {contact.lastName}
                  {contact.isPrimary && (
                    <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--accent)" }}>Contact principal</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--faint)" }}>
                  {[contact.roleTitle, contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            ))}
            {accountContacts.length === 0 && <p style={{ fontSize: 12.5, color: "var(--faint)" }}>Aucun contact.</p>}
          </div>

          <form action={createContactWithIds} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="hidden" name="accountId" value={account.id} />
            <input name="firstName" placeholder="Prénom" required style={smallInput} />
            <input name="lastName" placeholder="Nom" required style={smallInput} />
            <input name="roleTitle" placeholder="Fonction" style={smallInput} />
            <input name="email" type="email" placeholder="Email" style={smallInput} />
            <input name="phone" placeholder="Téléphone" style={smallInput} />
            <button type="submit" style={smallButton}>
              + Ajouter
            </button>
          </form>
        </section>

        <section>
          <h2 style={sectionTitle}>Interactions ({accountInteractions.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {accountInteractions.map((interaction) => (
              <div key={interaction.id} style={cardStyle}>
                <div style={{ fontSize: 11, color: "var(--faint)" }}>
                  {new Date(interaction.occurredAt).toLocaleDateString("fr-FR")} ·{" "}
                  {interactionKindLabels[interaction.kind]}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{interaction.subject}</div>
                {interaction.body && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{interaction.body}</div>}
              </div>
            ))}
            {accountInteractions.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--faint)" }}>Aucune interaction consignée.</p>
            )}
          </div>

          <form action={logInteractionWithIds} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
            <input type="hidden" name="accountId" value={account.id} />
            <div style={{ display: "flex", gap: 8 }}>
              <select name="kind" required style={smallInput} defaultValue="note">
                {interactionKindValues.map((value) => (
                  <option key={value} value={value}>
                    {interactionKindLabels[value]}
                  </option>
                ))}
              </select>
              <input name="subject" placeholder="Objet" required style={{ ...smallInput, flex: 1 }} />
            </div>
            <textarea name="body" placeholder="Détail (optionnel)" rows={2} style={{ ...smallInput, resize: "vertical" }} />
            <button type="submit" style={{ ...smallButton, alignSelf: "flex-start" }}>
              + Consigner
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--faint)", marginBottom: 10 };
const cardStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 12px" };
const smallInput: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 9px", fontSize: 12.6, background: "var(--surface)", color: "var(--text)" };
const smallButton: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "7px 13px", fontSize: 12.6, fontWeight: 600, cursor: "pointer" };
