# Brief projet — CRM SaaS dédié à l'industrie des outils coupants

## Contexte métier

Je suis ingénieur technico-commercial dans le secteur des outils coupants (céramique, CBN, carbure) pour l'usinage d'aciers trempés, fontes et superalliages (HRSA). Je veux construire un **CRM SaaS multi-clients**, inspiré de HubSpot dans son ergonomie et sa structure modulaire, mais **pensé spécifiquement pour les distributeurs et fabricants d'outils coupants et d'accessoires machines-outils**.

Cibles utilisatrices du SaaS :
- Distributeurs d'outils coupants et de fournitures industrielles
- Fabricants d'outils coupants et d'accessoires pour machines-outils (porte-outils, systèmes de serrage, etc.)

## Vision produit

Objectif : une plateforme complète, pas un MVP minimal. Je veux couvrir dès la conception :

1. **CRM core** : contacts, comptes clients (ateliers d'usinage, sous-traitants, industriels), pipeline commercial (deals), historique d'interactions
2. **Catalogue produits technique** : références outils coupants avec attributs métier (nuance, géométrie, revêtement, application matière — acier trempé/fonte/HRSA), compatible avec des fiches techniques riches
3. **Devis & tarification** : génération de devis, grilles tarifaires par client/distributeur, remises
4. **Suivi d'essais techniques** : un module spécifique au métier — suivi des essais outils chez le client (paramètres de coupe testés, résultats, comparatif carbure/céramique/CBN, ROI), qui n'existe pas dans un CRM généraliste
5. **Pipeline commercial visuel** : vues Kanban par étape de vente, comme HubSpot Sales Hub
6. **Reporting** : tableaux de bord par commercial, par zone, par famille de produits
7. **Multi-tenant SaaS** : isolation des données par client (distributeur A ne voit pas les données du distributeur B), gestion des comptes/abonnements

## Ce que je demande à Claude Code

1. **Propose une stack technique adaptée** à un SaaS multi-tenant destiné à évoluer (pas un simple prototype jetable) — argumente le choix (frontend, backend, base de données, auth, hébergement)
2. **Propose une architecture multi-tenant** (isolation des données, gestion des rôles : admin plateforme / admin client / commercial / lecture seule)
3. **Propose un modèle de données** couvrant les entités ci-dessus (contacts, comptes, deals, produits, devis, essais)
4. **Découpe le projet en phases de développement réalistes**, en commençant par le socle CRM + auth multi-tenant, puis le module produits/devis, puis le module essais techniques, puis le reporting
5. **Pose-moi toutes les questions nécessaires avant de coder** — notamment sur le volume de données attendu, le nombre de clients SaaS visés au démarrage, les intégrations souhaitées (ERP, email, téléphonie), et le niveau de personnalisation par client (champs custom, workflows custom)

## Contraintes et préférences

- Je préfère des outputs actionnables (code, structure de dossiers, schémas) plutôt que des discussions conceptuelles longues
- Esthétique visée si l'UI est abordée dès cette phase : sobre, professionnelle, orientée métier industriel (pas de style "startup SaaS générique")
- Je suis disponible pour trancher rapidement sur les questions d'architecture — n'hésite pas à me proposer des choix par défaut avec justification plutôt que de me laisser un choix ouvert sans recommandation

Commence par me poser tes questions de cadrage, puis propose une stack et une architecture avant d'écrire la moindre ligne de code.
