# KERF — Journal d'avancement

## 2026-07-30 (nuit, encore) — 5ᵉ écran maquette : onboarding "Premiers pas"

Benjamin a demandé de repenser l'UX en s'inspirant d'une vidéo sur la
psychologie UX des apps "addictives" (goal gradient, smart defaults,
IKEA effect, endowment effect, reciprocity, loss aversion).

**Décision** : appliquer sélectivement, pas en bloc. Une bonne partie de
cette vidéo vise des apps consumer (Duolingo, Spotify) dont l'objectif est
la rétention/l'engagement — ce n'est pas l'objectif de KERF, un outil pro
qu'on veut *efficace*, pas "addictif" (voir `CLAUDE.md`, densité d'info
choisie jamais subie). Écarté explicitement : urgence artificielle,
gamification, boucles de notification. Retenu et intégré à la maquette :
Goal Gradient + IKEA/Endowment effect, sous la forme d'un **écran
"Premiers pas"** (5ᵉ écran de `mockups/kerf-mockup.html`) — checklist
d'onboarding avec barre de progression (confirmer le pipeline, créer un
premier compte, créer un premier deal, inviter l'équipe).

**Point de vigilance respecté** : l'IKEA/Endowment effect suggérerait de
laisser le tenant personnaliser lui-même sa couleur/logo pour se sentir
propriétaire — **refusé volontairement**, ça contredirait la règle déjà
verrouillée (`ARCHITECTURE.md §3.6`) : la marque reste réservée à
`platform_admin`. L'ownership vient plutôt du pipeline et des premiers
comptes/deals créés, pas de la couleur.

Republié sur `kerf.surge.sh` et sur l'artifact Claude (même URL qu'avant).
Pas encore codé dans l'app réelle — c'est de la maquette, comme d'habitude
avant le code.

---

## 2026-07-30 (nuit, suite) — Premier push GitHub + démo publique Surge

- Dépôt poussé sur `https://github.com/benito2223-ux/kerf.git` (branche `main`).
  Un seul commit pour l'instant : tout le travail de cette session (cadrage,
  maquette, P0, début P1).
- **Attention pour la suite** : `kerf.surge.sh` héberge uniquement
  `mockups/kerf-mockup.html` (statique) — **pas l'application Next.js**.
  Surge ne sait servir que des fichiers statiques ; l'app réelle a de
  l'auth, des Server Actions et des requêtes base à chaque page (voir le
  build : presque toutes les routes sont marquées `ƒ` = dynamiques). Elle
  ne peut pas tourner sur Surge sans perdre tout ça. La démo publique sert
  à montrer la direction visuelle à un prospect ; l'app elle-même sera
  déployée sur Vercel (décision déjà prise, `ARCHITECTURE.md §1`) une fois
  une base connectée. Ne pas essayer de forcer un `next export` vers Surge
  pour "faire pareil" : ça casserait silencieusement l'auth et toutes les
  actions serveur.
- Pour republier la démo après une modification du mockup : recopier
  `mockups/kerf-mockup.html` en `index.html` dans un dossier temporaire
  (Surge sert `index.html` par défaut, le nom du fichier source ne
  convient pas tel quel), puis `npx surge <dossier> kerf.surge.sh`.


> Entrée la plus récente en haut. Sert de mémoire partagée entre sessions et
> entre IA différentes — mets à jour cette entrée (ou ajoute la tienne) après
> tout travail significatif. Ne recrée pas ce qui existe déjà : lis avant d'écrire.

---

## 2026-07-30 (nuit) — Début P1 : Comptes et Deals, 100 % local

**Décision de séquencement** : Benjamin a choisi de continuer tout le
développement en local et de **brancher Supabase (ou une alternative)
seulement à la fin du projet** — pas de projet cloud créé pour l'instant.
Aucun Docker ni Postgres local n'étant disponible sur cette machine non
plus, le code de cette session est **écrit et vérifié par typecheck/lint/
tests/build, mais jamais exécuté contre une vraie base**. À faire dès
qu'une base (locale ou cloud) sera branchée : `npm run db:generate`,
appliquer `db/migrations/0001_rls.sql`, puis `npm run test:rls` pour
confirmer que l'isolation fonctionne réellement, pas seulement sur le papier.

**Correction de fond apportée avant d'écrire la moindre feature** :
`lib/db/tenant-scope.ts` (`withTenantScope`). Sans ce correctif, les
requêtes Drizzle passées directement via `postgres.js` s'exécutent avec le
rôle de connexion du pool applicatif et **ignorent silencieusement la
RLS** — poser `request.jwt.claims` et `set local role authenticated` dans
une transaction est nécessaire à chaque requête métier, exactement comme le
fait PostgREST côté Supabase. `db/migrations/0001_rls.sql` a été mis à jour
en cohérence : il crée le rôle `authenticated` et une fonction `auth.jwt()`
de secours **uniquement si absents**, pour fonctionner à l'identique sur
Supabase et sur un Postgres nu ("alternative" évoquée par Benjamin) sans
jamais toucher aux objets internes de Supabase s'ils existent déjà.

**Fait — vérifié par `tsc --noEmit`, `eslint .`, `vitest run tests/domain`
(16/16) et `next build` (tous verts) :**
- `lib/validation/{account,contact,deal,interaction}.ts` : schémas Zod
  partagés entre formulaire et Server Action.
- `lib/db/pipelines.ts` : provisionnement idempotent d'un pipeline par
  défaut (6 étapes, mêmes noms que le mockup) au premier accès d'un tenant
  à l'écran Deals — pas de flux de configuration à faire avant de tester.
- **Module Comptes** : liste avec recherche (`comptes/page.tsx`), création
  (`comptes/nouveau`), fiche compte avec contacts et interactions consultables
  et ajoutables en ligne (`comptes/[id]`). Actions dans `comptes/actions.ts`.
- **Module Deals** : kanban par étape avec somme par colonne
  (`deals/page.tsx`), création (`deals/nouveau`), changement d'étape via un
  sélecteur qui soumet directement le Server Action (`DealStageSelect`,
  pas de drag-and-drop pour l'instant — voir "pas encore fait").
- Sidebar : "Comptes" et "Deals" ne sont plus grisés, ils pointent vers les
  vraies pages.

**Pas encore fait :**
- **Rien de tout ça n'a tourné dans un navigateur avec de vraies données** —
  seule la compilation et le build sont vérifiés. Première vraie validation
  fonctionnelle dès qu'une base est branchée.
- Drag-and-drop réel sur le kanban (actuellement un sélecteur d'étape) —
  volontairement reporté : le tester correctement demande une vraie base
  avec des deals dessus, pas seulement une compilation qui passe.
- Contacts en tant qu'écran à part (seulement imbriqué dans la fiche compte
  pour l'instant), champs custom, recherche globale, import Excel : reste
  de P1, pas commencé.
- Toujours aucun projet Supabase réel, aucun domaine réservé.

**Prochaine étape suggérée :** soit continuer P1 en local (champs custom,
import Excel, écran Contacts autonome), soit s'arrêter ici et brancher une
base (locale ou Supabase) pour valider ce qui existe déjà avant d'aller plus loin.

---

## 2026-07-30 (soir) — Démarrage P0 : socle technique

**Fait — vérifié, pas seulement écrit :**
- Dépôt git initialisé, `package.json` (Next.js 15, React 19, Tailwind v4,
  Drizzle, Supabase, next-intl, Vitest, @react-pdf/renderer, Resend, xlsx).
  `npm install` exécuté avec succès.
- `lib/db/schema.ts` : schéma Drizzle complet — les 25 tables de
  `ARCHITECTURE.md §4` (socle, CRM, catalogue, devis, essais).
- `db/migrations/0001_rls.sql` : fonctions `current_tenant_id()` /
  `is_platform_admin()` + RLS activée et policée sur toutes les tables
  tenant-scopées. **Pas encore appliqué à une vraie base** — aucun projet
  Supabase réel n'existe encore pour ce projet.
- `tests/rls/isolation.test.ts` : suite d'isolation à deux niveaux (statique
  — toute table avec `tenantId` doit avoir RLS + policy — et dynamique —
  cross-tenant réel). **Non exécutée** faute de `TEST_DATABASE_URL` ; à
  lancer dès qu'un projet Supabase de test existe.
- `lib/domain/trial-economics.ts`, `lib/domain/pricing.ts`,
  `lib/branding/derive-accent.ts` : calculs métier purs + **16 tests Vitest,
  tous passants** (`npm test`). Inclut le calcul de contraste WCAG qui
  garde-fou le choix de couleur d'un tenant (§3.6).
- Auth (`lib/auth/*`, `middleware.ts`) : session Supabase, résolution
  tenant/rôle depuis le JWT, garde de rôle, garde anti-changement d'URL de
  tenant. Écran de connexion fonctionnel (`app/(auth)/connexion`).
- Layout applicatif (`components/patterns/Sidebar.tsx`,
  `app/(app)/[tenant]/layout.tsx`) : reproduit la structure du mockup
  validé, applique la couleur d'accent du tenant au runtime si définie et
  si elle passe le contrôle de contraste — sinon retombe sur le bleu KERF
  par défaut, jamais d'échec silencieux.
- Console admin plateforme (`app/(platform)/admin`) : **liste de lecture
  seule** des tenants, protégée par `requirePlatformAdmin`. L'éditeur de
  marque (upload logo, palette, aperçu live — voir écran 4 du mockup)
  n'est **pas construit** : seule l'application runtime de la couleur l'est.
- i18n (`next-intl`) câblée, `messages/fr.json` alimenté par les écrans
  déjà écrits.
- CI GitHub Actions : lint + typecheck + tests unitaires systématiques ;
  tests RLS conditionnés à la présence du secret `TEST_DATABASE_URL`.
- `npx tsc --noEmit`, `npx eslint .` et `npx vitest run tests/domain` tous
  verts au moment de cette entrée.

**Pas encore fait — à ne pas supposer acquis :**
- Aucun projet Supabase réel créé (ni org, ni région choisie techniquement —
  seule la décision "UE" est prise). Aucune migration appliquée nulle part.
- Éditeur de marque (upload logo + palette + aperçu live) de la console
  admin : maquetté (écran 4), pas codé.
- P1 (comptes/contacts/deals), P2 (catalogue/devis), P3 (essais), P4
  (reporting) : rien commencé, comme prévu par le découpage en phases.
- Domaine (`kerf.app` ou équivalent) toujours pas réservé.
- Rien poussé sur un remote Git — dépôt local uniquement.

**Prochaine étape suggérée :** créer le projet Supabase réel (région UE),
appliquer `db:generate` puis `db/migrations/0001_rls.sql`, brancher
`.env.local`, lancer `npm run test:rls` pour valider l'isolation sur une
vraie base avant de commencer P1.

---

## 2026-07-30 — Cadrage, maquette et personnalisation marque

**Fait :**
- Cadrage complet du projet réalisé par questions cliquables successives —
  voir `ARCHITECTURE.md §1` pour la table de toutes les décisions.
- Stack, architecture multi-tenant (schéma partagé + RLS), modèle de données
  et découpage en phases (P0 → P5) rédigés dans `ARCHITECTURE.md`.
- Maquette statique publiée (`mockups/kerf-mockup.html`) : 4 écrans
  navigables — liste comptes, kanban deals, saisie d'essai mobile, et
  console admin de personnalisation marque (couleur + logo par tenant).
- Direction visuelle validée par Benjamin : **HubSpot-like**, accent bleu
  acier `#2A5C86`, police mono réservée aux valeurs de coupe (Vc, fn, ap,
  HRC, montants).
- Nouvelle exigence intégrée : personnalisation par tenant (couleur d'accent
  unique + logo), gérée exclusivement dans une console admin plateforme
  réservée à Benjamin seul — jamais exposée à un client. Détaillé dans
  `ARCHITECTURE.md §3.6`. La maquette admin inclut une validation de
  contraste WCAG en direct sur le choix de couleur (garde-fou, pas cosmétique).
- Principe produit renforcé et documenté dans `CLAUDE.md` : UI simple,
  évidente, ergonomique — densité d'info choisie, jamais subie.

**Pas encore fait :**
- Aucune ligne de code applicatif écrite. Rien en P0.
- Domaine (`kerf.app` ou équivalent) pas encore réservé.
- Nom de l'entreprise pilote pas encore confirmé (le profil — distributeur
  multi-marques — est arrêté, voir `ARCHITECTURE.md §1`).

**Prochaine étape suggérée :**
Validation de la maquette (4 écrans, notamment l'écran admin marque) par
Benjamin. Si validée et si rien d'autre ne bloque → démarrage de **P0**
(socle Next.js/Supabase région UE, auth, tenants, rôles, RLS sur tout le
schéma, suite de tests d'isolation, CI).

**Si tu reprends ce projet :** ne repose pas les questions de cadrage, ne
régénère pas la maquette depuis zéro, ne rouvre pas les choix de stack —
tout est dans `ARCHITECTURE.md`. Ajoute une entrée ici après ton travail.
