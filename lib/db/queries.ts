import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { tenants } from "./schema";

export async function getTenantBySlug(slug: string) {
  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  const tenant = await getTenantBySlug(slug);
  return tenant?.id ?? null;
}

export async function listTenants() {
  const db = getDb();
  return db.select().from(tenants).orderBy(tenants.name);
}
