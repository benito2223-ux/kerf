import { z } from "zod";

export const createDealSchema = z.object({
  accountId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string().trim().min(2, "Le titre du deal est requis."),
  amount: z.coerce.number().min(0, "Le montant doit être positif.").default(0),
  expectedClose: z.string().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

export const moveDealStageSchema = z.object({
  dealId: z.string().uuid(),
  stageId: z.string().uuid(),
});
