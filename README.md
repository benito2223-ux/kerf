# KERF

CRM SaaS multi-tenant pour les distributeurs et fabricants d'outils coupants.
Voir [`ARCHITECTURE.md`](ARCHITECTURE.md) pour le cadrage complet et
[`PROGRESS.md`](PROGRESS.md) pour l'état d'avancement réel — **à lire avant
toute contribution**, y compris par une autre IA (voir [`CLAUDE.md`](CLAUDE.md)).

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # renseigner les variables
npm run dev
```

Nécessite une base Postgres (Supabase région UE, ou toute alternative —
Neon par exemple, voir "Mode test" ci-dessous) avec le schéma appliqué :

```bash
npm run db:generate   # génère la migration SQL depuis lib/db/schema.ts
npm run db:migrate    # applique les tables
# puis appliquer manuellement db/migrations/0001_rls.sql (isolation RLS,
# voir ARCHITECTURE.md §3) — ce fichier n'est pas généré par Drizzle Kit :
node scripts/run-sql.mjs db/migrations/0001_rls.sql
```

### Mode test (sans Supabase)

Tant qu'aucun fournisseur d'auth définitif n'est branché (voir
`PROGRESS.md`), l'app peut tourner avec une base Postgres nue (ex. Neon,
gratuit) et une connexion de secours qui ne vérifie pas de mot de passe :

```bash
# .env.local
ENABLE_DEV_AUTH=1
DEV_SESSION_SECRET=<valeur aléatoire>
DATABASE_URL=<connexion Postgres>
```

Puis seeder un tenant et deux utilisateurs de test :

```bash
DATABASE_URL=<connexion Postgres> node scripts/seed-dev.mjs
```

Se connecter ensuite sur `/dev-connexion` (pas `/connexion`, qui reste le
vrai écran Supabase). **`ENABLE_DEV_AUTH=1` ne doit jamais être défini en
production** — sans cette variable, `/dev-connexion` refuse de fonctionner
et `getSession()` ignore entièrement ce mécanisme.

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
