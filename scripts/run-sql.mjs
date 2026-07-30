// Utilitaire ponctuel : exécute un fichier .sql contre DATABASE_URL.
// Sert à appliquer db/migrations/0001_rls.sql, que drizzle-kit ne génère
// pas (voir README.md). Pas un script de prod — jetable.
import { readFileSync } from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <fichier.sql>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);
const query = readFileSync(file, "utf-8");

try {
  await sql.unsafe(query);
  console.log(`OK — ${file} appliqué.`);
} finally {
  await sql.end();
}
