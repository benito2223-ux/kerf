import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "../../lib/db/schema";

/**
 * Garde-fou d'isolation multi-tenant (ARCHITECTURE.md §3.4).
 *
 * Nécessite une vraie base Supabase (locale via `supabase start`, ou un
 * projet de test) dans TEST_DATABASE_URL — ce n'est pas testable contre un
 * Postgres nu, la RLS s'appuie sur `auth.jwt()` fourni par Supabase.
 *
 * Partie A (statique) : toute table du schéma Drizzle qui porte `tenantId`
 * DOIT avoir la RLS activée et au moins une policy. Une nouvelle table
 * ajoutée sans être listée dans db/migrations/0001_rls.sql fait échouer
 * ce test — c'est volontaire, ne pas le contourner.
 *
 * Partie B (dynamique) : deux tenants réels, un compte chacun, vérifie
 * qu'un utilisateur du tenant A n'obtient jamais une ligne du tenant B,
 * ni en lecture ni en écriture.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

function tenantScopedTables(): string[] {
  const names: string[] = [];
  for (const value of Object.values(schema)) {
    if (typeof value !== "object" || value === null) continue;
    try {
      const columns = getTableColumns(value as never);
      if ("tenantId" in columns) names.push(getTableName(value as never));
    } catch {
      // pas une pgTable (enum, relation…) — ignoré
    }
  }
  return names;
}

describe.skipIf(!TEST_DATABASE_URL)("Isolation RLS multi-tenant", () => {
  const admin = postgres(TEST_DATABASE_URL ?? "", { prepare: false });
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    const [a] = await admin`insert into tenants (name, slug) values ('Test Tenant A', ${"test-a-" + crypto.randomUUID()}) returning id`;
    const [b] = await admin`insert into tenants (name, slug) values ('Test Tenant B', ${"test-b-" + crypto.randomUUID()}) returning id`;
    tenantA = a!.id;
    tenantB = b!.id;
    await admin`insert into accounts (tenant_id, name, type) values (${tenantA}, 'Compte A', 'atelier')`;
    await admin`insert into accounts (tenant_id, name, type) values (${tenantB}, 'Compte B', 'atelier')`;
  });

  afterAll(async () => {
    await admin`delete from tenants where id in (${tenantA}, ${tenantB})`;
    await admin.end();
  });

  it("chaque table tenant-scopée du schéma a la RLS activée et au moins une policy", async () => {
    const tables = tenantScopedTables();
    expect(tables.length).toBeGreaterThan(0);

    for (const table of tables) {
      const [rls] = await admin`
        select relrowsecurity from pg_class where relname = ${table}
      `;
      expect(rls?.relrowsecurity, `RLS désactivée sur "${table}"`).toBe(true);

      const policies = await admin`
        select policyname from pg_policies where tablename = ${table}
      `;
      expect(policies.length, `Aucune policy sur "${table}"`).toBeGreaterThan(0);
    }
  });

  async function asTenant(tenantId: string) {
    const client = postgres(TEST_DATABASE_URL ?? "", { prepare: false });
    await client`select set_config('request.jwt.claims', ${JSON.stringify({
      app_metadata: { tenant_id: tenantId, role: "sales" },
    })}, true)`;
    await client`set role authenticated`;
    return client;
  }

  it("un utilisateur du tenant A ne voit jamais les comptes du tenant B", async () => {
    const asA = await asTenant(tenantA);
    try {
      const rows = await asA`select name, tenant_id from accounts`;
      expect(rows.every((r) => r.tenant_id === tenantA)).toBe(true);
      expect(rows.some((r) => r.tenant_id === tenantB)).toBe(false);
    } finally {
      await asA.end();
    }
  });

  it("un utilisateur du tenant A ne peut pas écrire une ligne rattachée au tenant B", async () => {
    const asA = await asTenant(tenantA);
    try {
      await expect(
        asA`insert into accounts (tenant_id, name, type) values (${tenantB}, 'Injection', 'atelier')`,
      ).rejects.toThrow();
    } finally {
      await asA.end();
    }
  });
});
