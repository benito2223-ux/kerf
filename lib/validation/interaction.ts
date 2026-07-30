import { z } from "zod";

export const interactionKindValues = ["appel", "visite", "email", "reunion", "note"] as const;
export const interactionKindLabels: Record<(typeof interactionKindValues)[number], string> = {
  appel: "Appel",
  visite: "Visite",
  email: "Email",
  reunion: "Réunion",
  note: "Note",
};

export const logInteractionSchema = z.object({
  accountId: z.string().uuid(),
  kind: z.enum(interactionKindValues),
  subject: z.string().trim().min(2, "L'objet est requis."),
  body: z.string().trim().optional(),
});

export type LogInteractionInput = z.infer<typeof logInteractionSchema>;
