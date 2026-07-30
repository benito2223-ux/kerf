import { eq } from "drizzle-orm";
import type { TenantTx } from "./tenant-scope";
import { pipelines, pipelineStages } from "./schema";

const DEFAULT_STAGES = [
  { name: "Qualification", probability: 10 },
  { name: "Essai en cours", probability: 40 },
  { name: "Devis envoyé", probability: 60 },
  { name: "Négociation", probability: 80 },
  { name: "Gagné", probability: 100, isWon: true },
  { name: "Perdu", probability: 0, isLost: true },
];

/**
 * Chaque tenant a besoin d'un pipeline pour utiliser les deals — la
 * configuration fine (renommer, réordonner) est un réglage de paramètres
 * (ARCHITECTURE.md §3.5), pas un préalable bloquant. On provisionne un
 * pipeline par défaut au premier accès, une seule fois par tenant.
 */
export async function getOrCreateDefaultPipeline(tx: TenantTx, tenantId: string) {
  const [existing] = await tx
    .select()
    .from(pipelines)
    .where(eq(pipelines.tenantId, tenantId))
    .limit(1);

  if (existing) return existing;

  const [pipeline] = await tx
    .insert(pipelines)
    .values({ tenantId, name: "Pipeline commercial", isDefault: true })
    .returning();

  if (!pipeline) throw new Error("Échec de la création du pipeline par défaut");

  await tx.insert(pipelineStages).values(
    DEFAULT_STAGES.map((stage, position) => ({
      pipelineId: pipeline.id,
      tenantId,
      name: stage.name,
      position,
      probability: stage.probability,
      isWon: stage.isWon ?? false,
      isLost: stage.isLost ?? false,
    })),
  );

  return pipeline;
}
