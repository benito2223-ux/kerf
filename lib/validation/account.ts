import { z } from "zod";

export const accountTypeValues = ["atelier", "sous_traitant", "industriel", "distributeur"] as const;
export const accountTypeLabels: Record<(typeof accountTypeValues)[number], string> = {
  atelier: "Atelier d'usinage",
  sous_traitant: "Sous-traitant",
  industriel: "Industriel",
  distributeur: "Distributeur",
};

export const accountStatusValues = ["prospect", "actif", "dormant"] as const;
export const accountStatusLabels: Record<(typeof accountStatusValues)[number], string> = {
  prospect: "Prospect",
  actif: "Actif",
  dormant: "Dormant",
};

export const createAccountSchema = z.object({
  name: z.string().trim().min(2, "Le nom du compte doit contenir au moins 2 caractères."),
  type: z.enum(accountTypeValues),
  sector: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .url("URL invalide — inclure https://")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
