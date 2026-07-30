"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { interactions } from "../../../../lib/db/schema";
import { interactionKindValues } from "../../../../lib/validation/interaction";

const logContactInteractionSchema = z.object({
  contactId: z.string().uuid(),
  kind: z.enum(interactionKindValues),
  subject: z.string().trim().min(2, "L'objet est requis."),
  body: z.string().trim().optional(),
});

export async function logContactInteraction(tenantSlug: string, formData: FormData) {
  const session = await requireSession();

  const parsed = logContactInteractionSchema.safeParse({
    contactId: formData.get("contactId"),
    kind: formData.get("kind"),
    subject: formData.get("subject"),
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  await withTenantScope(session, (tx) =>
    tx.insert(interactions).values({
      tenantId: session.tenantId!,
      entity: "contact",
      entityId: parsed.data.contactId,
      kind: parsed.data.kind,
      subject: parsed.data.subject,
      body: parsed.data.body,
      authorId: session.userId,
    }),
  );

  revalidatePath(`/${tenantSlug}/contacts/${parsed.data.contactId}`);
}
