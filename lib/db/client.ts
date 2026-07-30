import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Connexion applicative — utilise TOUJOURS le rôle authentifié (jamais
 * service_role). L'isolation entre tenants vient de la RLS Postgres,
 * pas d'un WHERE ajouté manuellement dans chaque requête.
 * Voir ARCHITECTURE.md §3.3.
 */
function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant — voir .env.example");
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

let cached: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!cached) cached = createDb();
  return cached;
}
