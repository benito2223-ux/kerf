"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "../../../../lib/auth/guard";
import { withTenantScope } from "../../../../lib/db/tenant-scope";
import { accounts, contacts, interactions } from "../../../../lib/db/schema";
import { createAccountSchema } from "../../../../lib/validation/account";
import { createContactSchema } from "../../../../lib/validation/contact";
import { logInteractionSchema } from "../../../../lib/validation/interaction";

export async function createAccount(tenantSlug: string, formData: FormData) {
  const session = await requireSession();

  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    sector: formData.get("sector"),
    phone: formData.get("phone"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  const [account] = await withTenantScope(session, (tx) =>
    tx
      .insert(accounts)
      .values({
        tenantId: session.tenantId!,
        ownerId: session.userId,
        ...parsed.data,
      })
      .returning({ id: accounts.id }),
  );

  revalidatePath(`/${tenantSlug}/comptes`);
  redirect(`/${tenantSlug}/comptes/${account!.id}`);
}

export async function createContact(tenantSlug: string, formData: FormData) {
  const session = await requireSession();

  const parsed = createContactSchema.safeParse({
    accountId: formData.get("accountId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  await withTenantScope(session, (tx) =>
    tx.insert(contacts).values({ tenantId: session.tenantId!, ...parsed.data }),
  );

  revalidatePath(`/${tenantSlug}/comptes/${parsed.data.accountId}`);
}

export async function logInteraction(tenantSlug: string, formData: FormData) {
  const session = await requireSession();

  const parsed = logInteractionSchema.safeParse({
    accountId: formData.get("accountId"),
    kind: formData.get("kind"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }

  await withTenantScope(session, (tx) =>
    tx.insert(interactions).values({
      tenantId: session.tenantId!,
      entity: "account",
      entityId: parsed.data.accountId,
      kind: parsed.data.kind,
      subject: parsed.data.subject,
      body: parsed.data.body,
      authorId: session.userId,
    }),
  );

  revalidatePath(`/${tenantSlug}/comptes/${parsed.data.accountId}`);
}
