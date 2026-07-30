"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "../../../../../lib/auth/guard";
import { withTenantScope } from "../../../../../lib/db/tenant-scope";
import { customFieldDefs } from "../../../../../lib/db/schema";
import { z } from "zod";

const customFieldDefSchema = z.object({
  entity: z.enum(["account", "contact", "deal", "product", "trial"]),
  key: z
    .string()
    .trim()
    .min(1, "La clé est requise (ex. : secteur, taille).")
    .regex(/^[a-z][a-z0-9_]*$/, "Clé en minuscules, alphanumérique + underscores uniquement."),
  label: z.string().trim().min(2, "Le label est requis."),
  type: z.enum(["text", "number", "select", "boolean", "date"]),
  options: z.array(z.string()).optional(),
  position: z.number().int().nonnegative().optional(),
  required: z.boolean().optional().default(false),
});

export type CustomFieldDefInput = z.infer<typeof customFieldDefSchema>;

export async function createCustomFieldDef(
  tenantSlug: string,
  formData: FormData,
) {
  const session = await requireSession();

  const parsed = customFieldDefSchema.safeParse({
    entity: formData.get("entity"),
    key: formData.get("key"),
    label: formData.get("label"),
    type: formData.get("type"),
    options: formData.get("options")
      ? (formData.get("options") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    position: formData.get("position")
      ? Number(formData.get("position"))
      : undefined,
    required: formData.get("required") === "on",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  // Check duplicate key within tenant+entity
  const existing = await withTenantScope(session, (tx) =>
    tx
      .select()
      .from(customFieldDefs)
      .where(
        and(
          eq(customFieldDefs.tenantId, session.tenantId!),
          eq(customFieldDefs.entity, parsed.data.entity),
          eq(customFieldDefs.key, parsed.data.key),
        ),
      )
      .limit(1),
  );
  if (existing?.length) {
    throw new Error(
      `Un champ "${parsed.data.key}" existe déjà pour ${parsed.data.entity}.`,
    );
  }

  const maxPosition = await withTenantScope(session, (tx) =>
    tx
      .select({ max: desc(customFieldDefs.position) })
      .from(customFieldDefs)
      .where(
        and(
          eq(customFieldDefs.tenantId, session.tenantId!),
          eq(customFieldDefs.entity, parsed.data.entity),
        ),
      )
      .limit(1),
  );

  const maxPos = maxPosition?.[0]?.max as number | undefined;
  await withTenantScope(session, (tx) =>
    tx.insert(customFieldDefs).values({
      tenantId: session.tenantId!,
      entity: parsed.data.entity,
      key: parsed.data.key,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.options ?? [],
      position: parsed.data.position ?? (maxPos ?? 0) + 1,
      required: parsed.data.required,
    }),
  );

  revalidatePath(`/${tenantSlug}/parametres/champs`);
  redirect(`/${tenantSlug}/parametres/champs`);
}

export async function deleteCustomFieldDef(
  tenantSlug: string,
  formData: FormData,
) {
  const session = await requireSession();
  const defId = formData.get("defId") as string;

  await withTenantScope(session, (tx) =>
    tx
      .delete(customFieldDefs)
      .where(
        and(
          eq(customFieldDefs.id, defId),
          eq(customFieldDefs.tenantId, session.tenantId!),
        ),
      ),
  );

  revalidatePath(`/${tenantSlug}/parametres/champs`);
}
