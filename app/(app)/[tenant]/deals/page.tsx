import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { accounts, deals, pipelineStages } from "../../../../lib/db/schema";
import { getOrCreateDefaultPipeline } from "../../../../lib/db/pipelines";
import { DealsKanban } from "../../../../components/patterns/DealsKanban";
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
  const dealList = board.deals.map((d) => ({
    id: d.id,
    title: d.title,
    amount: d.amount,
    stageId: d.stageId,
    accountName: d.accountName,
  }));
  const moveDealStageWithTenant = moveDealStage.bind(null, tenantSlug);

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

      <DealsKanban
        stages={stageList}
        initialDeals={dealList}
        moveDealStage={moveDealStageWithTenant}
      />
    </main>
  );
}
