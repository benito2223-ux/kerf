# KERF — Instructions projet

Ce fichier est chargé automatiquement par Claude Code dans ce dossier. Si tu es
une autre IA (ou une autre session) qui intervient sur ce projet sans le charger
automatiquement, **lis-le en entier avant d'écrire quoi que ce soit.**

## Contexte

KERF est un **CRM SaaS multi-tenant pour les distributeurs et fabricants
d'outils coupants** (céramique, CBN, carbure). Projet commercial indépendant,
porté par Benjamin Rouquette pour être **proposé à de futurs clients externes**
— sans rapport avec SPK/CeramTec, qui est son employeur.

## Avant de commencer tout travail — dans cet ordre

1. **Lire `ARCHITECTURE.md`** — stack, architecture multi-tenant, modèle de
   données, phases, design system. Toutes les décisions structurantes y sont
   déjà tranchées et justifiées. Ne rouvre pas un choix déjà fait sans une
   raison nouvelle et explicite venant de Benjamin — pas de ta propre initiative.
2. **Lire `PROGRESS.md`** — journal chronologique, entrée la plus récente en
   haut. Dit ce qui a été fait, ce qui a été décidé, et quelle est la
   prochaine étape. **Mets-le à jour après toute session de travail
   significative** (nouvelle décision, code écrit, maquette modifiée) pour
   que la session suivante — même avec une IA différente — ne reparte pas de
   zéro et ne pose pas deux fois les mêmes questions.
3. **Regarder `mockups/`** avant de proposer une direction visuelle. La
   direction (HubSpot-like, accent bleu acier personnalisable, mono sur les
   valeurs de coupe) est validée. Ne la réinvente pas sans qu'on te le demande.

## Qui est l'utilisateur

Benjamin Rouquette — ingénieur technico-commercial dans l'outil coupant,
**pas développeur de métier**. Il conçoit et pilote le produit, le code est
écrit par l'IA. Il répond en français, souvent en dictée vocale (ponctuation
absente, phrases longues) — ne pas se formaliser sur la forme.

Il attend une **direction assumée**, pas un catalogue d'options : trancher,
annoncer la décision et sa raison en une ou deux phrases, avancer. Il valide
vite quand la proposition est claire. Ne pose une question que si la réponse
change réellement l'architecture ou l'UI — sinon assume et signale l'hypothèse.

## Principes produit non négociables

- **UI simple, évidente, ergonomique.** L'inspiration « startup » est
  acceptée quand elle sert l'efficacité (raccourcis, feedback immédiat, zéro
  friction) — jamais pour la décoration gratuite.
- **Un écran = une tâche.** Densité d'information choisie, jamais subie. Si
  un écran a besoin d'un mode d'emploi pour être compris, il est raté.
- **Personnalisation multi-client** : chaque tenant a sa couleur d'accent et
  son logo. Ce réglage est géré **uniquement** depuis la console admin
  plateforme, réservée à Benjamin (`platform_admin`). Ne jamais exposer ce
  réglage à un `tenant_admin` ou à un commercial — c'est une décision
  produit assumée, pas un oubli à corriger. Voir `ARCHITECTURE.md §3.6`.
- Le reste des principes de développement (pas d'abstraction prématurée, pas
  de code mort, sécurité par défaut) suit les instructions globales de
  l'utilisateur — pas la peine de les redupliquer ici.

## État du design system

Voir `ARCHITECTURE.md §6`. Accent par défaut : bleu acier `#2A5C86`.
L'accent est la **seule** valeur personnalisable par tenant ; toutes les
variantes (survol, fonds faibles) sont calculées automatiquement à partir de
cette unique couleur — jamais saisies à la main. Les autres tokens (neutres,
succès/alerte/danger) sont fixes pour tous les tenants.

## Ne pas dupliquer le travail

Si tu es une nouvelle session ou une IA différente de celle qui a écrit ce
fichier :
- Ne recommence pas le cadrage — il est fait, voir `ARCHITECTURE.md §1`.
- Ne redemande pas les questions déjà tranchées dans ce même fichier.
- Ne régénère pas une maquette si `mockups/kerf-mockup.html` existe déjà et
  n'a pas été explicitement rejeté par Benjamin. Modifie-la, ne la remplace
  pas depuis zéro.
- Avant d'écrire du code applicatif, vérifie dans `PROGRESS.md` que le socle
  (P0) n'a pas déjà été commencé ailleurs.

## Fichiers du projet

```
ARCHITECTURE.md    Stack, architecture multi-tenant, modèle de données, phases, design system
PROGRESS.md        Journal chronologique — état d'avancement réel du projet
prompt-*.md        Brief original de Benjamin (source, ne pas modifier)
mockups/           Maquettes HTML statiques validées ou en cours de validation
```
