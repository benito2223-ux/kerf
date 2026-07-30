// Seed de test — base Neon jetable uniquement. Crée un tenant et deux
// utilisateurs de test (commercial + admin plateforme) pour se connecter
// via /dev-connexion (voir lib/auth/dev-session.ts). Jamais à lancer
// contre une base de production.
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

try {
  const [tenant] = await sql`
    insert into tenants (name, slug)
    values ('Métral Diffusion Industrielle', 'metral-diffusion-industrielle')
    returning id, name, slug
  `;

  const salesUserId = randomUUID();
  const adminUserId = randomUUID();

  await sql`
    insert into memberships (tenant_id, user_id, role)
    values
      (${tenant.id}, ${salesUserId}, 'sales'),
      (${tenant.id}, ${adminUserId}, 'platform_admin')
  `;

  console.log("Tenant créé :", tenant.name, `(/${tenant.slug})`);
  console.log("Utilisateur commercial :", salesUserId);
  console.log("Utilisateur admin plateforme :", adminUserId);
  console.log("\nOuvrir /dev-connexion et choisir un des deux profils.");
} finally {
  await sql.end();
}
