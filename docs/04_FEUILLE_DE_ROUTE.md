# 04 — Feuille de route (build par lots)

Avancer **lot par lot**. À la fin de chaque lot : `pnpm build` passe, `pnpm lint` propre,
critères de recette cochés, et point d'étape avant de continuer.

## Lot 0 — Fondations (scaffold)
- Initialiser Next.js (App Router) + TypeScript strict, Tailwind, shadcn/ui, ESLint/Prettier, pnpm.
- Prisma + PostgreSQL **Neon** (pooled `DATABASE_URL` + `DIRECT_URL`) ; Postgres local optionnel via docker-compose. `schema.prisma` du kit, 1re migration (`prisma migrate dev`).
- Auth.js + provider Microsoft Entra ID (mock activable si pas de tenant), modèle de rôles.
- Layout général : barre latérale + thème indigo/orange (tokens de `03_CHARTE_UI.md`).
- Script de **seed** depuis les données du prototype (`reference/icc-finance-gestion-rh.jsx`).
- **Recette** : appli démarre, login (réel ou mock), menu navigable, base seedée, build/lint OK.

## Lot 1 — Employés (cœur RH)
- Liste « Utilisateurs » : tableau complet, recherche, tri, pagination, filtres (statut, contrat, agence).
- 4 KPI calculés. Bouton + formulaire « Créer un membre » (Zod). Édition. Statut actif/inactif.
- Fiche membre 360° (panneau) : onglets RH / ORIAS / Formation / Informatique (lecture).
- Contrôle d'accès (rôles + périmètre agence) + journal d'audit sur écriture.
- **Recette** : CRUD membre fonctionnel, KPI exacts, accès restreint vérifié côté serveur.

## Lot 2 — Agences
- Liste agences (type, statut, directeur(s), raison sociale/forme juridique), KPI, recherche/filtre.
- Création/édition agence + association directeur(s). Fiche agence (membres rattachés, ORIAS, SharePoint).
- **Recette** : CRUD agence, directeurs multiples, périmètre agence respecté.

## Lot 3 — Ordinateurs (parc)
- Liste parc : modèle/série, dates, barre disque colorée, statut dérivé (>34/>36 mois), utilisateur.
- 4 KPI (Attribués / Libres / À renouveler / Expirés). Filtres (état, agence, attribué/libre).
- Attribution/désattribution d'un poste à un membre. Édition manuelle.
- **Recette** : statuts/âges corrects, attribution fonctionnelle, KPI exacts.

## Lot 4 — Redevance
- Paramètres (prix Silver/Gold HT, TVA, agences exclues) dans `Setting`.
- Tableau par agence avec colonnes regroupées/colorées, calculs HT/TTC, moyenne/personne.
- 4 KPI (Silver / Gold / moyenne / totale). Export CSV/Excel.
- **Recette** : totaux cohérents avec le parc, exclusions appliquées, export OK.

## Lot 5 — Dashboard & Onboarding
- Dashboard : 4 KPI agrégés, histogramme recrutements (Recharts), derniers postes masterisés.
- Workflow onboarding paramétrable : étapes, avancement, responsable ; tableau « nouveaux arrivants ».
- Déclenchement d'un onboarding à la création d'un membre.
- **Recette** : dashboard alimenté par les vraies données, onboarding créable et suivi.

## Lot 6 — Alertes, notifications, tâches planifiées
- Calcul des alertes (ORIAS/RC Pro à renouveler, parc >34/36 mois, heures formation, dossier incomplet).
- Notifications email (rappels). Tâches planifiées via **Vercel Cron** (`vercel.json`, endpoints `/api/cron/*` protégés par `CRON_SECRET`) : recalcul parc, échéances ORIAS, redevance.
- Centre d'alertes (carte dashboard + page dédiée).
- **Recette** : alertes correctes, au moins un envoi de rappel testé (mailer mock/réel).

## Lot 7 — Intégrations Microsoft (Graph)
- Derrière `lib/integrations/` : provisioning compte AD (onboarding), lecture bibliothèques SharePoint
  (boutons « SharePoint »), état boîte mail. Implémentation **mock** + réelle.
- **Recette** : parcours onboarding déclenche les appels (mock vérifiable), liens SharePoint actifs.

## Lot 8 — Durcissement & livraison
- Tests Vitest (services de calcul : âge parc, redevance, statut ORIAS) + Playwright (smoke des 5 écrans).
- RGPD : revue des accès, page journal d'audit, export tracé, politique de conservation.
- Accessibilité, responsive, i18n FR. **Déploiement Vercel + Neon** : variables d'environnement, `prisma migrate deploy` au build, Vercel Cron configuré. README de déploiement.
- **Recette** : suite de tests verte, check-list RGPD validée, déploiement documenté.

## Priorités si arbitrage nécessaire
1. Employés + Agences (RH) → 2. Ordinateurs + Redevance (IT) → 3. Dashboard/Onboarding →
4. Alertes → 5. Intégrations → 6. Durcissement.
