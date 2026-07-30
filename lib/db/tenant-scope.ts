import { sql } from "drizzle-orm";
import { getDb } from "./client";
import type { AppSession } from "../auth/session";

type Db = ReturnType<typeof getDb>;
export type TenantTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Ouvre une transaction et y injecte les claims du JWT (`tenant_id`, `role`)
 * exactement comme le ferait Supabase PostgREST, puis bascule sur le rôle
 * `authenticated`.
 *
 * Sans cette étape, une requête Drizzle passée directement par `postgres.js`
 * s'exécute avec le rôle de connexion du pool applicatif — la RLS ne lit
 * `auth.jwt()` que si `request.jwt.claims` est posé sur la session en
 * cours. Oublier ce wrapper revient à annuler l'isolation multi-tenant
 * décrite dans ARCHITECTURE.md §3.3, silencieusement : toute nouvelle
 * requête métier doit passer par ici, jamais par `getDb()` directement en
 * dehors des scripts d'administration/seed.
 */
export async function withTenantScope<T>(session: AppSession, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      app_metadata: { tenant_id: session.tenantId, role: session.role },
    });
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
