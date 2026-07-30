# KERF — Architecture

> CRM SaaS pour l'industrie de l'outil coupant.
> Document de cadrage validé avant écriture de code. Cadrage complet — voir §1.

---

## 1. Décisions de cadrage (validées)

| Sujet | Décision |
|---|---|
| Cible V1 | Pilote **en production** chez 1–2 clients réels. Pas de données factices en prod. |
| Personnalisation tenant | **Champs custom** sur les entités principales + pipeline renommable. **Pas** de moteur de workflows en V1. |
| Saisie des essais | Web responsive, **écrans essais pensés tactile** (téléphone/tablette au pied de la machine). Pas de mode hors-ligne. |
| Langue | **FR seul**, mais i18n câblée dès la première ligne (`next-intl`). |
| Devis | **PDF généré dans l'app**, archivé, envoyable par mail. Connecteur ERP hors périmètre V1. |
| Catalogue | **Import Excel/CSV par tenant** avec mapping de colonnes. Pas de référentiel central. |
| Email/agenda | **Journal d'interactions manuel.** Pas d'OAuth Outlook/Gmail en V1. |
| Direction UI | **HubSpot-like** : clair, aéré, fin. Accent bleu acier au lieu d'orange. Mono sur les valeurs de coupe. |
| Nom du produit | **KERF** — le sillon de coupe. Domaine à réserver (kerf.app / kerf-crm.com). |
| Visibilité interne | **Tout le monde voit tout** dans un tenant. `owner_id` sert au reporting et au filtre « Mon portefeuille », pas au cloisonnement. |
| Profil du pilote | **Distributeur multi-marques** → catalogue et tarifs (P2) passent **avant** le module essais (P3). |
| Volumétrie catalogue | **1 000 à 10 000 références** par tenant → `pg_trgm` + `tsvector`, filtres à facettes, pagination serveur. |
| Devises / sites | **Euro seul, un établissement.** Colonne `currency` présente dans le schéma mais sélecteur masqué : ouverture possible sans migration lourde. |
| Personnalisation marque | Chaque tenant a **sa couleur d'accent et son logo**, réglables uniquement depuis une console **admin plateforme réservée à Benjamin** (`platform_admin`). Aucun tenant ne peut modifier sa propre marque. Voir §3.6. |
| Principe produit | **UI simple, évidente, ergonomique** — inspiration startup admise si elle sert l'efficacité, jamais la décoration gratuite. Densité d'info contrôlée : un écran = une tâche, pas d'empilement. |

---

## 2. Stack technique

### Choix

| Couche | Technologie | Raison |
|---|---|---|
| Frontend + backend | **Next.js 15**, App Router, Server Components + Server Actions | Un seul déploiement, un seul langage. Les Server Actions évitent d'écrire une API REST/tRPC séparée pour un CRUD métier — moins de code à maintenir seul. |
| Langage | **TypeScript** strict | Les types générés depuis le schéma Postgres remontent jusqu'aux formulaires. Sur un modèle de données à ~25 tables, c'est ce qui évite les régressions silencieuses. |
| Styles | **Tailwind CSS v4** | Le design system vit dans des tokens CSS, pas dans des fichiers dispersés. Rehabiller l'app = changer les tokens. |
| Composants | **shadcn/ui** | Code copié dans le repo, pas une dépendance : on le restyle intégralement. C'est la condition pour ne pas ressembler à un template. |
| Tables | **TanStack Table** | Tri, filtres, colonnes réordonnables, pagination serveur. Indispensable pour un CRM. |
| Formulaires | **react-hook-form + Zod** | Un schéma Zod = validation client + validation serveur + type TypeScript. Une seule source de vérité. |
| Base de données | **PostgreSQL via Supabase**, région **UE (Paris ou Francfort)** | RLS Postgres = isolation multi-tenant au niveau moteur, pas au niveau code. Tu connais déjà l'outil. |
| Migrations | **Drizzle Kit** | Migrations SQL versionnées dans le repo, relisables. Pas de schéma modifié à la main dans l'interface Supabase. |
| Auth | **Supabase Auth** (mot de passe + magic link) | Invitations, reset, sessions gérés. Le `tenant_id` est injecté dans le JWT, ce qui rend les policies RLS rapides. |
| Fichiers | **Supabase Storage** | Photos d'usure d'arête, PDF de devis, fiches techniques, logos tenant. Buckets cloisonnés par `tenant_id`. |
| PDF | **@react-pdf/renderer** | Génération en pur JS, aucun binaire Chromium à héberger. Contrôle typographique fin sur le devis — qui est un document commercial vu par le client final. |
| Email transactionnel | **Resend** | Invitations, envoi de devis. Domaine à authentifier (SPF/DKIM) sinon les devis tombent en spam. |
| Import Excel | **SheetJS** côté serveur | Parsing xlsx/csv, mapping de colonnes, rapport d'erreurs ligne à ligne. |
| i18n | **next-intl** | Clés de traduction dès le départ, `fr.json` seul aujourd'hui. |
| Hébergement | **Vercel**, fonctions en région **cdg1 (Paris)** | Colocalisation avec la base UE : sans ça, chaque requête fait un aller-retour transatlantique. |
| Tests | **Vitest** (logique métier, calculs ROI) + **Playwright** (parcours critiques) + **tests RLS dédiés** | Voir §3.4 : les tests d'isolation sont non négociables sur un produit multi-tenant. |

### Ce que je n'ai volontairement pas retenu

- **Prisma** — sa gestion du RLS et des connexions serverless est plus pénible que Drizzle sur Supabase.
- **Une API séparée (NestJS, Express)** — deux déploiements, deux jeux de types, aucun bénéfice à cette échelle.
- **Stripe / billing** — hors périmètre : sur un pilote, tu factures à la main. À ajouter le jour où tu ouvres le self-service.
- **Un ORM côté client** — toutes les écritures passent par des Server Actions, jamais par le navigateur.

---

## 3. Architecture multi-tenant

### 3.1 Modèle d'isolation : schéma partagé + RLS

Une seule base, une seule instance de chaque table, colonne `tenant_id` obligatoire partout, et des policies Postgres qui filtrent systématiquement.

**Pourquoi pas un schéma par tenant** : chaque migration devrait être rejouée N fois, et le pooler serverless supporte mal la multiplication des schémas. Le schéma partagé est ce que font HubSpot, Notion et Linear.

**Le risque à connaître** : une seule table créée sans RLS activée = fuite de données entre distributeurs. C'est le point de non-retour du projet, et la raison du §3.4.

### 3.2 Rôles

| Rôle | Portée |
|---|---|
| `platform_admin` | Toi. Accès transverse aux tenants pour le support. Chaque accès est tracé dans le journal d'audit. |
| `tenant_admin` | Le patron / responsable commercial du distributeur. Gère les utilisateurs, les pipelines, les champs custom, les grilles tarifaires. |
| `sales` | Le commercial. Crée et modifie comptes, contacts, deals, devis, essais. Ne modifie pas les grilles tarifaires, ne dépasse pas le plafond de remise fixé par son admin. |
| `viewer` | Lecture seule — ADV, direction, assistante. |

Point à trancher (question ouverte n°2) : le commercial voit-il tous les comptes du tenant ou seulement son portefeuille ? Les deux sont prévus par le schéma (`owner_id` sur `accounts` et `deals` + un réglage tenant `restrict_to_owner`), mais le choix doit être fait avant la phase 1.

### 3.3 Mécanique technique

- À la connexion, le `tenant_id` et le rôle sont écrits dans `app_metadata` du JWT.
- Une fonction Postgres `current_tenant_id()` (`STABLE`) lit ce claim — donc pas de sous-requête par ligne.
- Chaque table porte : `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + une policy `USING (tenant_id = current_tenant_id())`.
- **La clé `service_role` ne sert jamais aux requêtes applicatives** — uniquement aux tâches d'administration hors requête utilisateur. Toute requête faite avec cette clé contourne le RLS.
- Buckets Storage : chemins préfixés `{tenant_id}/...` avec des policies Storage alignées.

### 3.4 Tests d'isolation (non négociable)

Une suite dédiée qui, pour **chaque table** du schéma, vérifie que :
1. la RLS est activée ;
2. un utilisateur du tenant A obtient zéro ligne du tenant B en lecture ;
3. une écriture forçant un `tenant_id` étranger est rejetée.

Le test énumère les tables depuis `pg_catalog` : une nouvelle table sans policy fait échouer la CI automatiquement. C'est le garde-fou qui permet d'avancer vite ensuite.

### 3.5 Champs custom

- `custom_field_defs` (tenant_id, entity, key, label, type, options, ordre, obligatoire)
- Colonne `custom jsonb NOT NULL DEFAULT '{}'` sur `accounts`, `contacts`, `deals`, `products`, `trials`
- Index GIN sur `custom` pour la recherche
- Validation Zod construite dynamiquement à partir des définitions du tenant

Compromis assumé : pas d'intégrité référentielle sur ces champs. C'est le prix de la souplesse, et c'est ce que fait HubSpot.

### 3.6 Marque blanche par tenant (couleur + logo)

Le produit est vendu à plusieurs clients concurrents entre eux : chacun doit reconnaître sa couleur et son logo dans l'outil, sans que ce réglage devienne une source de support ou de risque visuel.

**Qui peut y toucher** : personne côté client. Ni `tenant_admin` ni `sales` n'ont accès à ce réglage — c'est une décision produit, pas une négligence à corriger plus tard. La personnalisation vit exclusivement dans `/(platform)/admin`, réservé à `platform_admin` (Benjamin). Le client fournit sa couleur et son logo par email ou en rendez-vous ; Benjamin les applique. Ça évite qu'un client choisisse un jaune fluo illisible et t'écrive un ticket de support pour ça.

**Ce qui est personnalisable** — volontairement restreint à deux choses :
1. **Une couleur d'accent** (une seule valeur hex). Tous les autres tokens du design system — neutres, succès, alerte, danger — restent identiques pour tous les tenants. Les variantes dérivées (survol, fond faible, fond faible appuyé) sont **calculées automatiquement** depuis cette unique couleur (éclaircissement/assombrissement en HSL), pas saisies à la main : un client ne peut pas produire une palette incohérente.
2. **Un logo** (PNG/SVG, fond transparent recommandé), affiché dans la sidebar à la place du sigle KERF.

**Garde-fou obligatoire** : avant d'enregistrer une couleur, calcul du contraste (WCAG) entre la couleur et le blanc utilisé comme texte des boutons primaires. En dessous du seuil AA, l'enregistrement est bloqué avec un message explicite — pas une validation cosmétique, une règle dure, sinon un client choisit sa couleur corporate pastel et les boutons deviennent illisibles.

**Mécanique technique** :
```
tenants.branding jsonb  -- { accent_hex, logo_path, logo_updated_at }
```
- Le logo est stocké dans le bucket Storage `tenant-branding/{tenant_id}/logo.*`.
- Au chargement, un Server Component lit `tenants.branding` et injecte un bloc `<style>` qui redéfinit `--accent`, `--accent-hover`, `--accent-weak`, `--accent-weak-strong` pour la requête en cours. Le reste de l'app ne sait pas qu'elle est personnalisée : elle consomme des tokens, jamais une couleur en dur.
- Tenant sans `branding` renseigné → bleu acier KERF par défaut.

---

## 4. Modèle de données

### 4.1 Socle

```
tenants            id, name, slug, logo_path, settings jsonb, created_at
memberships        id, tenant_id, user_id → auth.users, role, is_active
invitations        id, tenant_id, email, role, token, expires_at, accepted_at
custom_field_defs  id, tenant_id, entity, key, label, type, options jsonb, position, required
audit_log          id, tenant_id, actor_id, action, entity, entity_id, diff jsonb, at
attachments        id, tenant_id, entity, entity_id, storage_path, filename, mime, size, uploaded_by
```

### 4.2 CRM

```
accounts     id, tenant_id, name, siret, type (atelier|sous_traitant|industriel|distributeur),
             sector, address jsonb, phone, website, owner_id, machine_park jsonb,
             status, custom jsonb, created_at
contacts     id, tenant_id, account_id, first_name, last_name, role_title,
             email, phone, mobile, is_primary, custom jsonb
pipelines        id, tenant_id, name, is_default
pipeline_stages  id, pipeline_id, name, position, probability, is_won, is_lost
deals        id, tenant_id, account_id, pipeline_id, stage_id, title, amount,
             currency, expected_close, owner_id, source, trial_id (nullable),
             lost_reason, custom jsonb
interactions id, tenant_id, entity (account|contact|deal|trial), entity_id,
             kind (appel|visite|email|reunion|note), occurred_at, subject,
             body, author_id
tasks        id, tenant_id, entity, entity_id, title, due_at, assignee_id, done_at
```

### 4.3 Catalogue et tarification

```
products         id, tenant_id, sku, name, brand, family (plaquette|fraise|foret|porte_outil|serrage|accessoire),
                 material_class (carbure|ceramique|cbn|pcd|hss|acier),
                 grade, geometry, coating, iso_groups text[] (P/M/K/N/S/H),
                 applications text[], dimensions jsonb, list_price, currency,
                 is_active, custom jsonb, datasheet_path
price_lists      id, tenant_id, name, currency, valid_from, valid_to, is_default
price_list_items id, price_list_id, product_id, unit_price, discount_pct, min_qty
account_pricing  id, tenant_id, account_id, price_list_id
import_jobs      id, tenant_id, kind, filename, mapping jsonb, rows_total,
                 rows_ok, rows_error, report jsonb, status, created_by
```

`iso_groups` en tableau et non en champ simple : une nuance SiAlON couvre S et H, un whisker couvre H et K. Un champ unique aurait forcé la duplication de références.

### 4.4 Devis

```
quotes       id, tenant_id, number (séquence par tenant et par année), account_id,
             contact_id, deal_id, status (brouillon|envoye|accepte|refuse|expire),
             currency, valid_until, global_discount_pct, notes, terms,
             subtotal, tax_rate, total, pdf_path, sent_at, owner_id
quote_lines  id, quote_id, position, product_id (nullable → ligne libre),
             description, quantity, unit, unit_price, discount_pct, line_total
```

Les montants sont **figés à la ligne** lors de la création, jamais recalculés depuis le catalogue : un devis émis il y a six mois doit rester identique après un changement de tarif. Les montants sont stockés en `numeric(14,4)`, jamais en flottant.

### 4.5 Module essais — le différenciateur

C'est le module qui n'existe dans aucun CRM généraliste, et c'est lui qui doit être le plus soigné.

```
trials          id, tenant_id, ref (séquence tenant), account_id, contact_id,
                owner_id, title, objective,
                machine_make, machine_model, machine_power_kw, spindle_max_rpm,
                stability (bonne|moyenne|faible),
                operation (tournage|fraisage|alesage|rainurage|filetage|percage),
                part_ref, part_qty_year,
                workpiece_material, workpiece_iso_group, hardness_hrc,
                cooling (arrosage|air|MQL|sec|haute_pression),
                status (planifie|en_cours|concluant|non_concluant|abandonne),
                started_at, ended_at, conclusion, custom jsonb

trial_tools     id, trial_id, role (reference|candidat), product_id (nullable),
                label, material_class, grade, geometry, coating, tool_cost, edges_per_insert

trial_runs      id, trial_tool_id, run_no, vc, fn, ap, ae, rpm, feed_mm_min,
                passes, cooling_override,
                pieces_per_edge, tool_life_min, machining_time_per_part_s,
                wear_mode (usure_frontale|entaille|ecaillage|rupture|arete_rapportee|deformation|fissuration_thermique),
                wear_vb_mm, surface_ra, chip_shape, noise_vibration,
                verdict (ok|limite|ko), notes, recorded_at, recorded_by

trial_photos    id, trial_run_id, storage_path, kind (arete|copeau|piece|montage), caption

trial_economics id, trial_id, hourly_machine_rate, hourly_labor_rate,
                baseline_cost_per_part, candidate_cost_per_part,
                saving_per_part, saving_per_year, payback_months, computed_at
```

Points de conception :
- `trial_runs` séparé de `trial_tools` : un essai enchaîne plusieurs passes à paramètres différents sur le même outil. C'est la réalité du terrain et c'est ce qui permet le tableau comparatif.
- Le comparatif carbure / céramique / CBN sort naturellement de `role = reference` contre les `candidat`.
- `trial_economics` est **calculé et stocké**, pas recalculé à l'affichage : le chiffre présenté au client doit être reproductible six mois plus tard.
- Un essai concluant peut être rattaché à un `deal` (`deals.trial_id`) : c'est le lien entre la preuve technique et l'argent, et c'est l'argument de vente du produit.

---

## 5. Découpage en phases

| Phase | Contenu | Durée |
|---|---|---|
| **P0 — Socle** | Repo, Next.js, Supabase UE, design system et tokens, layout applicatif, auth, tenants, invitations, rôles, RLS sur tout le schéma, suite de tests d'isolation, journal d'audit, CI | 1 sem |
| **P1 — CRM core** | Comptes, contacts, deals en Kanban (drag & drop), pipelines configurables, interactions, tâches, champs custom, recherche globale, import Excel comptes/contacts | 2 sem |
| **P2 — Catalogue & devis** | Produits avec attributs métier, import Excel + mapping + rapport d'erreurs, grilles tarifaires, plafond de remise par rôle, devis, PDF, envoi par mail | 2 sem |
| **P3 — Essais techniques** | Le module différenciateur. Écrans tactiles pour le pied de machine, photos d'usure, comparatif multi-outils, calcul ROI, export PDF du rapport d'essai | 2 sem |
> Ordre confirmé P0 → P1 → **P2** → P3 : le pilote est un distributeur multi-marques, son besoin immédiat est le catalogue et les grilles tarifaires.
| **P4 — Reporting** | Tableaux de bord par commercial / zone / famille produit, entonnoir de conversion, taux de réussite des essais, exports | 1 sem |
| **P5 — Mise en production pilote** | Sauvegardes vérifiées, registre RGPD, DPA Supabase, page de mentions, tests de charge légers, onboarding du premier distributeur | 3–5 j |

Total : **environ 8 semaines**. P1 à P3 sont livrables indépendamment — tu peux mettre le pilote en service à la fin de P1 et enrichir ensuite.

Hors périmètre, à replanifier après le pilote : workflows automatisés, connecteur ERP, intégration Outlook, mode hors-ligne, billing self-service, application mobile native.

---

## 6. Design system

**Principe directeur, rappelé à chaque écran conçu** : simple, évident, ergonomique. L'inspiration « startup » est acceptée quand elle sert la rapidité d'usage (raccourcis, feedback immédiat, zéro friction) — jamais pour la décoration. Un écran traite une tâche ; la densité d'information est choisie, jamais subie. Si un écran a besoin d'un mode d'emploi pour être compris, il est raté.


HubSpot comme référence d'ergonomie : clair, aéré, fin. Divergence assumée sur la couleur d'accent et sur le traitement des valeurs numériques métier.

```
--canvas      #F6F8FA   fond d'application
--surface     #FFFFFF   cartes, tableaux, sidebar
--border      #E3E8EE   bordures 1px, jamais d'ombre portée marquée
--text        #1B2733   texte principal
--muted       #5B6B7C   labels, texte secondaire
--accent      #2A5C8A   bleu acier — actions primaires, étape active
--accent-weak #EAF1F8   fonds sélectionnés, badges
--success     #1F7A4D   essai concluant, deal gagné
--warn        #B4700E   verdict limite, devis proche expiration
--danger      #B42318   rupture d'arête, deal perdu
--radius      6px
```

- **Typographie** : Inter pour l'interface. **JetBrains Mono uniquement sur les valeurs de coupe** (Vc, fn, ap, ae, HRC, durée de vie) — les chiffres s'alignent en colonne et deviennent comparables d'un coup d'œil. C'est le seul signe distinctif « métier » de l'interface, et il est fonctionnel, pas décoratif.
- **Densité** : aérée sur les fiches et les formulaires, compacte sur les tableaux de liste. Hauteur de ligne 44 px sur desktop, 56 px en tactile.
- **Sidebar claire** avec bordure fine, navigation à deux niveaux, repliable.
- **Aucun dégradé, aucune illustration, aucune ombre diffuse.** Ce qui donne l'impression de sérieux, c'est l'alignement et la cohérence des espacements, pas les effets.
- **Écrans essais** : cibles tactiles de 48 px minimum, pavés numériques natifs (`inputMode="decimal"`), sélection du mode d'usure par vignettes illustrées plutôt que par liste déroulante, capture photo directe.

---

## 7. Structure de dossiers

```
/app
  /(auth)                    connexion, invitation, mot de passe oublié
  /(app)/[tenant]
    /dashboard
    /comptes/[id]            + actions.ts (Server Actions colocalisées avec la route, pas dans /lib)
    /contacts/[id]
    /deals                   kanban + liste + actions.ts
    /produits
    /devis/[id]
    /essais/[id]             écrans tactiles
    /rapports
    /parametres              utilisateurs, pipelines, champs custom, tarifs, marque
  /(platform)/admin          console platform_admin
  /api                       webhooks, génération PDF
/lib
  /db                        schéma Drizzle, migrations, requêtes, tenant-scope (RLS), pipelines
  /auth                      session, garde de rôle, résolution du tenant
  /domain                    calculs ROI, coût pièce, remises — pur, testé
  /branding                  dérivation de la couleur d'accent tenant + contrôle de contraste
  /validation                schémas Zod par entité, partagés formulaire ↔ Server Action
  /pdf                       gabarits devis et rapport d'essai
  /import                    parsing xlsx, mapping, validation
/components
  /ui                        shadcn rehabillé
  /patterns                  DataTable, KanbanBoard, EntityHeader, CustomFieldForm
/messages/fr.json
/tests
  /rls                       tests d'isolation multi-tenant
  /domain
  /e2e
```

Le dossier `/lib/domain` ne contient **aucun accès base ni aucun composant** : uniquement les calculs métier (coût à la pièce, économie annuelle, retour sur investissement, cascade de remises). C'est du code pur, testable ligne à ligne — et ce sont les chiffres que tu montreras à un client, donc ils doivent être justes et vérifiables.

---

## 8. Sauvegardes, continuité et sécurité — argumentaire client

Le produit est vendu à des industriels qui vont y faire vivre leurs comptes clients, leurs tarifs et leurs essais techniques. C'est un critère d'achat, pas un détail technique : cette section est écrite pour être **montrée telle quelle à un prospect**, pas seulement lue en interne.

### 8.1 Sauvegardes

| Ce qui est garanti | Détail |
|---|---|
| Sauvegarde automatique quotidienne | Toutes les données de tous les tenants, chiffrées, sans action requise du client. |
| Rétention | 7 jours en formule standard. |
| Restauration à un instant précis (PITR) | Disponible en option — restaure la base à la minute près sur une fenêtre glissante (7 à 28 jours selon formule). À proposer comme **option payante distincte**, pas incluse par défaut : c'est ce que font Supabase et tous les hébergeurs sérieux, et ça te donne un vrai argument tarifaire à deux niveaux (« Essentiel » / « Entreprise »). |
| Export à la demande | Chaque tenant peut exporter l'intégralité de ses données (comptes, deals, produits, devis, essais) en CSV/JSON depuis l'app, sans dépendre de toi. Argument anti-verrouillage : rassure un prospect qui craint de « perdre ses données si l'éditeur disparaît ». |
| Test de restauration | Une restauration réelle (sur un environnement de test) doit être exécutée avant chaque mise en production pilote, puis à intervalle régulier — une sauvegarde jamais testée n'est pas une garantie. |

### 8.2 Sécurité

| Sujet | Ce qui est en place |
|---|---|
| Isolation entre clients | Chaque distributeur est isolé au niveau du moteur de base de données (RLS Postgres, §3.1), pas seulement au niveau du code applicatif. Deux distributeurs concurrents utilisant KERF ne peuvent techniquement pas voir l'un chez l'autre. |
| Chiffrement | Données chiffrées au repos et en transit (TLS) de bout en bout, sans configuration ni surcoût. |
| Hébergement | Union européenne (France/Allemagne) — aucune donnée client ne quitte l'UE. |
| Journal d'audit | Toute action sur les données sensibles (tarifs, remises, suppression) est tracée, horodatée et attribuée à un utilisateur. |
| Principe du moindre privilège | Les accès techniques d'administration (clé `service_role`) ne servent jamais aux requêtes de l'application — seul le compte de l'utilisateur connecté agit sur ses propres données. |
| Comptes et accès | Mots de passe gérés par le fournisseur d'authentification (jamais stockés en clair), sessions expirables, invitations à durée limitée, révocation d'accès immédiate à la suppression d'un utilisateur. |
| Sécurité du code | Dépendances scannées automatiquement en intégration continue, secrets jamais commités dans le code. |

### 8.3 Ce que je ne te fais pas dire

Je n'ai mis **aucun chiffre d'engagement de disponibilité (SLA)** dans cette section. « 99,9 % de disponibilité » est une promesse contractuelle, pas une caractéristique technique : elle engage juridiquement, et hériter du SLA public de Vercel/Supabase n'équivaut pas à le proposer toi-même à un client sous ton propre nom. Avant de l'écrire dans une plaquette commerciale ou un contrat, vérifie les conditions de service en cours des deux fournisseurs et decide si tu veux le répercuter tel quel, l'assortir de réserves, ou t'appuyer sur une offre supérieure (support prioritaire) le jour où un client l'exige contractuellement.

## 9. Points restés ouverts

Le cadrage est complet, plus rien ne bloque la phase 0. Restent deux sujets à traiter le moment venu :

1. **Nom du pilote** — le profil est arrêté (distributeur multi-marques) mais l'entreprise reste à confirmer. Sans impact sur l'architecture ; nécessaire avant la mise en production réelle (DPA, registre RGPD, données de départ à importer).
2. **Réservation du domaine** — `kerf.app`, `kerf-crm.com` ou équivalent. À faire avant P0 : le domaine sert à authentifier l'envoi des mails (SPF/DKIM), et un domaine non authentifié envoie les devis en spam.

## 10. Étape en cours

P0 : socle technique en cours de construction (voir `PROGRESS.md` pour l'état réel, mis à jour à chaque session).
Maquette statique des 4 écrans structurants déjà validée : `mockups/kerf-mockup.html`.
