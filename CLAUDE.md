# CLAUDE.md — Outil GESTION RH ICC Finance

Contexte permanent pour Claude Code. À garder à jour au fil du projet.

## 1. Objectif

Refondre l'outil interne **GESTION RH** d'ICC Finance (réseau de courtage en crédit immobilier,
~24 agences) en application web moderne. L'outil pilote :
- les **ressources humaines** (membres du réseau : salariés, mandataires, franchisés, affiliés) ;
- la **partie informatique** (parc d'ordinateurs, redevances logicielles Silver/Gold, accès) ;
- le **suivi des formations** (formation continue DDA/DCI) ;
- le **suivi des immatriculations ORIAS** (catégories, renouvellement annuel, RC Pro, garantie financière).

La spécification détaillée est dans `docs/01_CAHIER_DES_CHARGES.md`.
La cible visuelle est `reference/icc-finance-gestion-rh.jsx`.

## 2. Stack technique (imposée)

- **Framework** : Next.js (App Router) + TypeScript (strict).
- **UI** : Tailwind CSS + shadcn/ui (Radix). Thème custom indigo/orange (voir `docs/03_CHARTE_UI.md`).
- **Tables** : TanStack Table. **Graphiques** : Recharts.
- **Formulaires/validation** : React Hook Form + Zod.
- **ORM / BDD** : Prisma + PostgreSQL **Neon** (serverless). Sur Vercel : `DATABASE_URL` = connexion **pooled** Neon (hôte en `-pooler`) pour le runtime, `DIRECT_URL` = connexion **directe** pour les migrations. Option edge : adaptateur `@prisma/adapter-neon`.
- **Auth** : **Clerk** (`@clerk/nextjs`) — connexion par e-mail, comptes par invitation. Les rôles applicatifs sont portés par le `publicMetadata` Clerk (`role`, `scopedAgencyId`) et lus côté serveur via l'adaptateur `src/auth.ts` (`auth()` → `session.user`).
- **Intégrations** : Microsoft Graph (comptes AD, bibliothèques SharePoint, état boîte mail).
  Toujours derrière une interface (`lib/integrations/`) avec une implémentation **mock** activable.
- **Tâches planifiées** : via **Vercel Cron** (`vercel.json`), endpoints `/api/cron/*` protégés par `CRON_SECRET` (pas de scheduler long-running) — recalcul de l'âge du parc, rappels de renouvellement ORIAS, recalcul redevances.
- **Tests** : Vitest (unitaire) + Playwright (smoke des écrans clés).
- **Gestion de paquets** : pnpm. **Hébergement** : **Vercel** (Next.js) + **Neon** (PostgreSQL). `prisma migrate deploy` au build. Docker compose uniquement pour un Postgres local optionnel.

## 3. Conventions de code

- TypeScript strict, pas de `any` implicite. ESLint + Prettier.
- Server Components par défaut ; Client Components seulement si interaction.
- Accès données via **Server Actions** ou **Route Handlers**, jamais Prisma côté client.
- Validation Zod à toutes les frontières (formulaires, API).
- Nommage métier en **français** côté UI ; code/identifiants en anglais.
- Composants UI réutilisables dans `components/ui` (shadcn) et `components/` (métier).
- Couleurs/typo via tokens Tailwind (pas de hex en dur dans les composants).

## 4. Sécurité & RGPD (prioritaire)

Les données RH et ORIAS sont des **données personnelles sensibles**.
- **Contrôle d'accès** systématique : par rôle ET par périmètre d'agence (un directeur d'agence ne
  voit que son agence). Vérifier l'autorisation côté serveur sur chaque action, jamais seulement l'UI.
- **Journal d'audit** (`AuditLog`) pour toute création/modification/suppression et tout accès à une fiche.
- **Minimisation** : n'exposer que les champs nécessaires selon le rôle.
- **Aucun secret en dur** : tout via variables d'environnement (`.env`, voir `.env.example`).
- Durées de conservation et anonymisation des anciens membres à prévoir (champ `departureDate`).
- Export de données chiffré/horodaté et tracé.

## 5. Rôles

| Rôle | Périmètre |
|---|---|
| `ADMIN` | Tout (RH + IT + paramétrage) |
| `RH` | Membres, agences, formations, ORIAS (toutes agences) |
| `IT` | Parc informatique, redevances, onboarding technique |
| `DIRECTEUR_AGENCE` | Lecture + édition limitée **sur sa seule agence** |
| `LECTURE` | Lecture seule |

## 6. Commandes

- `pnpm dev` — développement
- `pnpm build` — build de production (doit passer à la fin de chaque lot)
- `pnpm lint` — lint (doit être propre)
- `pnpm prisma migrate dev` / `pnpm prisma db seed` — base + données de démo
- `pnpm test` / `pnpm test:e2e`

## 7. Definition of Done (par fonctionnalité)

1. Conforme au cahier des charges et proche du prototype visuel.
2. Données réelles (Prisma), pas de données en dur dans les composants.
3. Recherche + filtres + pagination + tri sur les tableaux concernés.
4. Création/édition via formulaires validés (Zod), avec gestion d'erreurs.
5. Contrôle d'accès serveur + entrée dans le journal d'audit.
6. Responsive, accessible (navigation clavier, contrastes), UI en français.
7. `pnpm build` et `pnpm lint` OK ; tests des chemins critiques.

## 8. Ce qu'il ne faut PAS faire

- Ne pas réutiliser le prototype `.jsx` tel quel (styles en ligne, pas de back).
- Ne pas câbler de vrais identifiants Microsoft/ORIAS sans demande explicite ; utiliser les mocks.
- Ne pas tout livrer d'un bloc : avancer **lot par lot** (voir `docs/04_FEUILLE_DE_ROUTE.md`).
