import { z } from "zod";

export const createContactSchema = z.object({
  accountId: z.string().uuid(),
  firstName: z.string().trim().min(1, "Le prénom est requis."),
  lastName: z.string().trim().min(1, "Le nom est requis."),
  roleTitle: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("Email invalide")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: z.string().trim().optional(),
  isPrimary: z.boolean().optional().default(false),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
