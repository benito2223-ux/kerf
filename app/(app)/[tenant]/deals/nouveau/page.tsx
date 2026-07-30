import { eq } from "drizzle-orm";
import { requireSession } from "../../../../../lib/auth/guard";
import { withTenantScope } from "../../../../../lib/db/tenant-scope";
import { accounts, pipelineStages } from "../../../../../lib/db/schema";
import { getOrCreateDefaultPipeline } from "../../../../../lib/db/pipelines";
import { createDeal } from "../actions";

export default async function NouveauDealPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const session = await requireSession();

  const { pipeline, stages, accountOptions } = await withTenantScope(session, async (tx) => {
    const pipeline = await getOrCreateDefaultPipeline(tx, session.tenantId!);
    const stages = await tx
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))
      .orderBy(pipelineStages.position);
    const accountOptions = await tx.select({ id: accounts.id, name: accounts.name }).from(accounts).orderBy(accounts.name);
    return { pipeline, stages, accountOptions };
  });

  const action = createDeal.bind(null, tenantSlug);

  return (
    <main style={{ padding: 32, maxWidth: 460 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nouveau deal</h1>

      {accountOptions.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          Aucun compte n&apos;existe encore — créez d&apos;abord un compte avant de rattacher un deal.
        </p>
      ) : (
        <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="pipelineId" value={pipeline.id} />

          <Field label="Compte">
            <select name="accountId" required style={inputStyle} defaultValue="">
              <option value="" disabled>
                Choisir un compte…
              </option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Titre du deal">
            <input name="title" required style={inputStyle} placeholder="Conversion carbure → céramique" />
          </Field>

          <Field label="Étape">
            <select name="stageId" required style={inputStyle} defaultValue={stages[0]?.id}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Montant (€)">
            <input name="amount" type="number" min="0" step="0.01" style={inputStyle} defaultValue="0" />
          </Field>

          <Field label="Date de clôture prévue">
            <input name="expectedClose" type="date" style={inputStyle} />
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
            Créer le deal
          </button>
        </form>
      )}
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
