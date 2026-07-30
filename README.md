# KERF

CRM SaaS multi-tenant pour les distributeurs et fabricants d'outils coupants.
Voir [`ARCHITECTURE.md`](ARCHITECTURE.md) pour le cadrage complet et
[`PROGRESS.md`](PROGRESS.md) pour l'état d'avancement réel — **à lire avant
toute contribution**, y compris par une autre IA (voir [`CLAUDE.md`](CLAUDE.md)).

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # renseigner les variables Supabase
npm run dev
```

Nécessite un projet Supabase (région UE) avec le schéma appliqué :

```bash
npm run db:generate   # génère la migration SQL depuis lib/db/schema.ts
npm run db:migrate    # applique les tables
# puis appliquer manuellement db/migrations/0001_rls.sql (isolation RLS,
# voir ARCHITECTURE.md §3) — ce fichier n'est pas généré par Drizzle Kit.
```

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm run lint` | ESLint |
| `npm run test` | Tests unitaires (`lib/domain`, `lib/branding`) |
| `npm run test:rls` | Tests d'isolation multi-tenant — nécessite `TEST_DATABASE_URL` (base Supabase réelle, jamais un Postgres nu : voir `tests/rls/isolation.test.ts`) |
| `npm run db:studio` | Explorateur de données Drizzle |

## État du projet

Socle (P0) : schéma de données complet, isolation RLS, auth, résolution de
tenant, layout applicatif, personnalisation de marque (application runtime).
Rien au-delà — pas de CRM, catalogue, devis ou essais encore construits.
Détail dans `PROGRESS.md`.
