"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../../lib/db/client";
import { memberships, tenants } from "../../../lib/db/schema";
import { setDevSession } from "../../../lib/auth/dev-session";

export async function devSignIn(formData: FormData) {
  if (process.env.ENABLE_DEV_AUTH !== "1") {
    throw new Error("Mode connexion de test désactivé (ENABLE_DEV_AUTH != 1)");
  }

  const userId = formData.get("userId") as string;
  const db = getDb();

  const [row] = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      tenantId: memberships.tenantId,
      tenantSlug: tenants.slug,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId))
    .limit(1);

  if (!row) throw new Error("Utilisateur de test introuvable — avez-vous lancé le seed ?");

  await setDevSession({
    userId: row.userId,
    email: `${row.userId.slice(0, 8)}@test.local`,
    tenantId: row.tenantId,
    role: row.role,
  });

  redirect(`/${row.tenantSlug}`);
}
