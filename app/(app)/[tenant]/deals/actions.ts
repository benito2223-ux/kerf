"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { deals, pipelineStages } from "../../../../lib/db/schema";
import { createDealSchema, moveDealStageSchema } from "../../../../lib/validation/deal";

export async function createDeal(tenantSlug: string, formData: FormData) {
  const session = await requireSession();

  const parsed = createDealSchema.safeParse({
    accountId: formData.get("accountId"),
    pipelineId: formData.get("pipelineId"),
    stageId: formData.get("stageId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    expectedClose: formData.get("expectedClose") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  await withTenantScope(session, (tx) =>
    tx.insert(deals).values({
      tenantId: session.tenantId!,
      ownerId: session.userId,
      accountId: parsed.data.accountId,
      pipelineId: parsed.data.pipelineId,
      stageId: parsed.data.stageId,
      title: parsed.data.title,
      amount: parsed.data.amount.toString(),
      expectedClose: parsed.data.expectedClose ? new Date(parsed.data.expectedClose) : undefined,
    }),
  );

  revalidatePath(`/${tenantSlug}/deals`);
  redirect(`/${tenantSlug}/deals`);
}

export async function moveDealStage(tenantSlug: string, formData: FormData) {
  const session = await requireSession();

  const parsed = moveDealStageSchema.safeParse({
    dealId: formData.get("dealId"),
    stageId: formData.get("stageId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  await withTenantScope(session, async (tx) => {
    const [stage] = await tx.select().from(pipelineStages).where(eq(pipelineStages.id, parsed.data.stageId)).limit(1);
    if (!stage) throw new Error("Étape introuvable");

    await tx
      .update(deals)
      .set({
        stageId: parsed.data.stageId,
        status: stage.isWon ? "gagne" : stage.isLost ? "perdu" : "ouvert",
      })
      .where(eq(deals.id, parsed.data.dealId));
  });

  revalidatePath(`/${tenantSlug}/deals`);
}
