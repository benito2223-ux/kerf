import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { accounts, deals, pipelineStages } from "../../../../lib/db/schema";
import { getOrCreateDefaultPipeline } from "../../../../lib/db/pipelines";
import { DealStageSelect } from "../../../../components/patterns/DealStageSelect";
import { moveDealStage } from "./actions";

export default async function DealsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const session = await requireSession();

  const board = await withTenantScope(session, async (tx) => {
    const pipeline = await getOrCreateDefaultPipeline(tx, session.tenantId!);
    const stages = await tx
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))
      .orderBy(pipelineStages.position);

    const dealRows = await tx
      .select({
        id: deals.id,
        title: deals.title,
        amount: deals.amount,
        stageId: deals.stageId,
        accountName: accounts.name,
      })
      .from(deals)
      .innerJoin(accounts, eq(deals.accountId, accounts.id))
      .where(eq(deals.pipelineId, pipeline.id));

    return { pipeline, stages, deals: dealRows };
  });

  const stageList = board.stages.map((s) => ({ id: s.id, name: s.name }));
  const moveDealStageWithTenant = moveDealStage.bind(null, tenantSlug);

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{board.pipeline.name}</h1>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>{board.deals.length} deals</span>
        <Link
          href={`/${tenantSlug}/deals/nouveau`}
          style={{
            marginLeft: "auto",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            padding: "7px 13px",
            fontSize: 12.8,
            fontWeight: 600,
          }}
        >
          + Nouveau deal
        </Link>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "18px 24px", display: "flex", gap: 14 }}>
        {board.stages.map((stage) => {
          const stageDeals = board.deals.filter((d) => d.stageId === stage.id);
          const stageSum = stageDeals.reduce((sum, d) => sum + Number(d.amount), 0);

          return (
            <div key={stage.id} style={{ width: 260, flex: "none", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 10px 6px" }}>
                <span style={{ fontSize: 12.6, fontWeight: 700 }}>{stage.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--faint)",
                    background: "var(--canvas)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "0 7px",
                  }}
                >
                  {stageDeals.length}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }} className="num-mono">
                  {stageSum.toLocaleString("fr-FR")} €
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "12px 13px",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{deal.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{deal.accountName}</div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 10,
                      }}
                    >
                      <span className="num-mono" style={{ fontWeight: 700, fontSize: 13 }}>
                        {Number(deal.amount).toLocaleString("fr-FR")} €
                      </span>
                      <DealStageSelect
                        dealId={deal.id}
                        stages={stageList}
                        currentStageId={deal.stageId}
                        moveDealStage={moveDealStageWithTenant}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
