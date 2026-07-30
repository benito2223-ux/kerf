# KERF — Journal d'avancement

## 2026-07-30 (nuit, encore plus tard) — Kanban drag & drop, écran Contacts, garde-fou dev-auth

**Ce qui a été livré dans cette session (IA Hermes, modèle Nemotron-3-ultra) :**

1. **Garde-fou dev-auth** (`components/patterns/DevAuthBanner.tsx` + intégration dans `app/(app)/[tenant]/layout.tsx`) : bandeau orange permanent « ENVIRONNEMENT DE TEST — connexion sans mot de passe active » affiché sur **toutes** les pages tenant quand `ENABLE_DEV_AUTH=1`. Impossible d'oublier qu'un déploiement est un environnement de test, même en démo devant un prospect.

2. **Kanban drag & drop** (`components/patterns/DealsKanban.tsx`) remplaçant le sélecteur d'étape :
   - dnd-kit (core, sortable, utilities) pour le glisser-déposer natif
   - Mise à jour optimiste : la carte bascule visuellement dès le drop, puis Server Action `moveDealStage` persiste
   - Colonnes d'étapes avec sommes par colonne, zones de dépôt vides avec texte « Déposez un deal ici »
   - Indication visuelle de la zone cible (outline accent + fond accent-weak)
   - Overlay de drag avec ombre portée, indicateur « Enregistrement… » pendant la transition serveur
   - `DealsKanban` remplace toute la grille dans `app/(app)/[tenant]/deals/page.tsx`

3. **Écran Contacts autonome** (P1) :
   - Liste contacts (`app/(app)/[tenant]/contacts/page.tsx`) : recherche multi-critères (nom, email, compte), tableau lisible, lien vers fiche contact + lien vers fiche compte
   - Fiche contact (`app/(app)/[tenant]/contacts/[id]/page.tsx`) : coordonnées, journal d'interactions (formulaire + liste), deals du compte
   - Action `logContactInteraction` (`app/(app)/[tenant]/contacts/actions.ts`) : ajout d'interaction depuis la fiche
   - Sidebar : entrée « Contacts » activée (plus grisée)

4. **Vérification réelle dans le navigateur** contre la base Neon de test :
   - Connexion via `/dev-connexion` (profil commercial)
   - Kanban deals : colonnes rendues, deal existant (42 000 €) dans « Essai en cours »
   - Drag & drop : dnd-kit monté (curseur grab, touch-action none, droppables enregistrés)
   - Liste contacts : 1 contact (Julien Roux, Mécaprec SAS)
   - Fiche contact : coordonnées, formulaire interaction, liste interactions (2 entrées après test), deals du compte
   - Bandeau dev-auth visible en permanence
   - `tsc --noEmit`, `eslint .`, 16/16 tests unitaires, `next build` : **tous verts**

**Points d'attention / dette technique :**
- Les 22 alertes `npm audit` restent toutes dans dev dependencies (eslint, vitest, vite, drizzle-kit via esbuild). Correction = major upgrades (eslint 10, vitest 4) — risque de régression, reporté à P5.
- Neon vs Supabase : le chemin dev-auth + grants Neon manuels continue de diverger du chemin Supabase. Date butoir suggérée : fin P1 pour trancher définitivement.
- Domaine `kerf.app` / `kerf-crm.com` toujours pas réservé — nécessaire pour SPF/DKIM (Resend) avant mise en prod pilote.

**Prochaine étape suggérée :** continuer P1 (champs custom, import Excel comptes/contacts) OU s'arrêter et trancher Neon vs Supabase + réserver le domaine avant d'aller plus loin.

---

## 2026-07-30 (nuit, encore plus tard) — 404 sur le lien nu, root page ajoutée

Benjamin a signalé un 404 sur le lien Vercel donné tel quel. Cause réelle :
il n'existait aucune page pour `/` — seules les sous-routes existaient
(`/dev-connexion`, `/[tenant]/...`). Un lien nu tombait donc sur un vrai
404, pas un problème de déploiement.

Ajout de `app/page.tsx` : redirige vers le tenant de la session en cours
si connecté, sinon vers `/dev-connexion` (si `ENABLE_DEV_AUTH=1`) ou
`/connexion` sinon. Bug intercepté avant de tester : la première version
redirigeait vers l'**ID** du tenant au lieu de son **slug** — corrigé avec
une nouvelle requête `getTenantSlugById` (`lib/db/queries.ts`). Vérifié en
local : un utilisateur déjà connecté atterrissant sur `/` est bien
redirigé vers son tableau de bord (`/metral-diffusion-industrielle`) sans
erreur. `next build` confirme que `/` est désormais une route dynamique
(plus de tentative de pré-génération statique qui aurait échoué).

---

## 2026-07-30 (nuit, très tard) — Déploiement Vercel réel, faille Next.js corrigée

Benjamin voulait tester sur Surge — rappel que Surge ne sert que du
statique, incapable de faire tourner cette app (auth, Server Actions,
requêtes base à chaque page). Il était déjà connecté à Vercel sur son
Chrome et a donné carte blanche : déploiement fait en pilotant son
navigateur réel (Claude in Chrome), pas le navigateur sandboxé habituel —
nécessaire puisque la session Vercel n'existe que là.

**Ce qui a été fait :**
- Import du repo GitHub `benito2223-ux/kerf` dans Vercel (intégration
  GitHub déjà autorisée, aucune création de compte nécessaire).
- Variables d'environnement posées manuellement dans l'interface Vercel :
  `DATABASE_URL` / `ENABLE_DEV_AUTH=1` / `DEV_SESSION_SECRET` (même base
  Neon de test qu'en local) + `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` factices
  pour éviter tout crash au build (mode Supabase inutilisé tant que
  `ENABLE_DEV_AUTH=1`).
- **Premier déploiement refusé par Vercel** — pas un bug applicatif : Next.js
  15.1.6 (version fixée depuis le tout début du projet) est vulnérable à
  une faille critique connue, CVE-2025-29927 (contournement d'authentification
  via middleware). Vercel bloque au niveau plateforme le déploiement des
  versions vulnérables détectées.
- **Corrigé** : mise à jour vers `next@15.5.22` (dernière stable de la même
  ligne 15.x, pas de saut vers la 16 majeure — moins de risque de régression
  sans pouvoir tout retester). Profité de l'occasion pour corriger aussi une
  injection SQL connue dans `drizzle-orm` (<0.45.2 → `^0.45.2`), toujours
  dans la même ligne 0.x. `tsc`, `eslint`, les 16 tests unitaires, les 3
  tests RLS contre Neon et `next build` repassés verts après la mise à jour.
- Redéploiement automatique déclenché par le `git push` (intégration
  GitHub ↔ Vercel active) — statut **Ready**.

**Vérifié pour de vrai sur l'URL publique** (pas seulement en local) :
`https://kerf-git-main-benito2223-6344s-projects.vercel.app` — connexion
via `/dev-connexion`, redirection vers le tableau de bord du tenant, et
`/metral-diffusion-industrielle/comptes` affiche bien le compte Mécaprec
SAS créé lors de la session précédente : c'est la **même base Neon** que
le test local, pas une base à part.

**Pas encore fait / à savoir :**
- Il reste 22 alertes `npm audit` non traitées — uniquement des dépendances
  de dev/CI (eslint, vitest/vite, xlsx), sans exposition en production.
  Pas bloquant, mais à ne pas oublier avant une vraie mise en production
  chez un client.
- `ENABLE_DEV_AUTH=1` est actif sur ce déploiement Vercel — **rappel
  impératif** : ne jamais laisser cette variable active sur un déploiement
  destiné à un client réel (elle désactive toute vérification de mot de
  passe). Ce déploiement Vercel est un environnement de test, pas un
  début de mise en production.
- Chaque futur `git push` sur `main` redéploiera automatiquement sur cette
  même URL Vercel — en avoir conscience avant de pousser du code cassé.

---

## 2026-07-30 (nuit, tard) — Première vérification réelle dans le navigateur

Benjamin a demandé de tester l'app réellement. Un projet Supabase gratuit
supplémentaire était impossible (2/2 projets déjà utilisés par SPK sur son
compte) ; Firebase écarté (incompatible avec l'architecture Postgres/RLS
déjà construite, et aucun outil Firebase connecté). **Décision** : base de
test sur **Neon** (Postgres gratuit, ne touche à rien chez SPK) — projet
créé par Benjamin, connexion transmise, tout le reste fait de ce côté.

**Neon n'a pas d'Auth** (juste Postgres) — ajout d'une **connexion de
secours locale**, `lib/auth/dev-session.ts` (cookie signé HMAC, aucune
vérification de mot de passe), activée uniquement par `ENABLE_DEV_AUTH=1`,
écran dédié `/dev-connexion` (le vrai `/connexion` Supabase n'est pas
touché). `getSession()` vérifie ce cookie en premier et ignore
silencieusement ce chemin si la variable n'est pas définie — donc aucun
risque que ça s'active par erreur en production.

**Trois vrais bugs trouvés et corrigés en testant en conditions réelles**
(aucun n'était détectable par typecheck/lint/tests unitaires seuls — la
preuve qu'il fallait vraiment cliquer dans l'app) :
1. `db/migrations/0001_rls.sql` supposait que le rôle de connexion obtenait
   automatiquement le droit `SET ROLE authenticated` après avoir créé ce
   rôle — vrai sur un superuser (Supabase), faux sur Neon (`neondb_owner`
   n'est pas superuser). Ajout d'un `grant authenticated to current_user`
   explicite, plus `grant usage on schema auth` / `grant execute on
   function auth.jwt()` au même rôle (sans ça : "permission denied for
   schema auth"). Sans cette correction, **la RLS ne fonctionnait tout
   simplement pas via l'application** — elle passait le test statique
   (policies présentes) mais échouait dès qu'on l'utilisait pour de vrai.
2. `middleware.ts` appelait Supabase sur **toutes les requêtes**, y compris
   en mode test sans URL/clé Supabase — plantait l'app entière. Ajout d'un
   court-circuit si `ENABLE_DEV_AUTH=1`.
3. Le formulaire d'ajout de contact (fiche compte) n'avait pas de champ
   téléphone alors que le Server Action l'attendait — `Error: Expected
   string, received null`. Champ ajouté.
4. `/dev-connexion` interroge la base sans qu'aucune API dynamique de
   Next.js le signale — `next build` essayait de la pré-générer en statique
   et plantait faute de base accessible au moment du build. Ajout de
   `export const dynamic = "force-dynamic"`.

**Vérifié pour de vrai, dans un navigateur, contre la vraie base Neon :**
connexion via les deux profils seedés (commercial, admin plateforme),
création d'un compte réel (Mécaprec SAS), ajout d'un contact, création
d'un deal (42 000 €), déplacement du deal de "Qualification" à "Essai en
cours" via le sélecteur — **le kanban se met à jour et le total par
colonne change en conséquence**. Confirmé aussi que le garde de rôle
bloque bien un commercial qui tente d'accéder à `/admin` (redirigé vers
"Accès refusé"). `tsc --noEmit`, `eslint .`, les 16 tests unitaires et
`next build` sont repassés verts après corrections.

**Pas encore fait / pas testé :**
- L'écran "Premiers pas" (onboarding) n'existe que dans la maquette —
  jamais branché à du vrai code, contrairement à Comptes/Deals.
- Contacts et interactions ne sont testés que depuis la fiche compte, pas
  en tant qu'écrans autonomes (ils n'existent pas encore).
- Champs custom, import Excel, recherche globale, essais, devis :
  toujours pas commencés (reste de P1 à P3).
- Neon reste une base **de test**, pas la décision finale — voir
  `ARCHITECTURE.md §1` : Supabase (ou une autre alternative) sera tranché
  à la fin du projet.

---

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
