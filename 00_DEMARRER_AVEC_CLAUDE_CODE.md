# Démarrer le projet avec Claude Code

Ce dossier est un **kit de démarrage** à remettre à Claude Code pour (re)construire l'outil
**GESTION RH** d'ICC Finance en application web de production.

## Contenu du kit

| Fichier | Rôle |
|---|---|
| `00_DEMARRER_AVEC_CLAUDE_CODE.md` | Ce guide + le prompt de lancement à copier |
| `CLAUDE.md` | Contexte projet permanent (stack, conventions, sécurité). **À placer à la racine du dépôt.** |
| `01_CAHIER_DES_CHARGES.md` | Spécification fonctionnelle, écran par écran |
| `02_MODELE_DONNEES.md` | Entités, relations, énumérations + schéma Prisma |
| `03_CHARTE_UI.md` | Charte graphique (couleurs, typo, composants) |
| `04_FEUILLE_DE_ROUTE.md` | Plan de construction par lots, avec critères de recette |
| `prisma/schema.prisma` | Schéma de base de données prêt à l'emploi |
| `.env.example` | Variables d'environnement attendues (Neon, Entra ID, Cron…) |
| `vercel.json` | Exemple de configuration **Vercel Cron** (tâches planifiées) |
| `reference/icc-finance-gestion-rh.jsx` | **Prototype visuel** : la cible UI/UX à reproduire |

## Mode d'emploi (3 étapes)

1. Créez un dépôt Git vide et copiez-y tout le contenu de ce dossier
   (mettez `CLAUDE.md` à la racine, le reste dans `docs/` si vous préférez).
2. Ouvrez Claude Code dans ce dépôt (`claude` en terminal, ou l'app).
3. Collez le **prompt de lancement** ci-dessous.

---

## Prompt de lancement (à copier-coller dans Claude Code)

```
Tu vas construire une application web de gestion RH / IT pour le réseau ICC Finance,
en repartant d'un outil existant dont tu as les captures et un prototype.

Avant d'écrire du code :
1. Lis CLAUDE.md, puis docs/01_CAHIER_DES_CHARGES.md, docs/02_MODELE_DONNEES.md,
   docs/03_CHARTE_UI.md et docs/04_FEUILLE_DE_ROUTE.md.
2. Ouvre reference/icc-finance-gestion-rh.jsx : c'est la CIBLE visuelle (thème indigo/orange,
   cartes KPI, tableaux). Tu dois t'en rapprocher, en version production (Tailwind + shadcn/ui).
3. Résume-moi en 10 lignes ce que tu vas faire au Lot 0 (scaffold) et au Lot 1, puis attends
   mon "GO" avant de coder.

Contraintes non négociables :
- Stack imposée : Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL,
  Auth.js avec Microsoft Entra ID (Azure AD).
- Hébergement : Vercel + base Neon (Postgres serverless). Prisma avec DATABASE_URL "pooled" + DIRECT_URL.
  Tâches planifiées via Vercel Cron (vercel.json).
- Données RH/ORIAS = données personnelles sensibles → respect RGPD (contrôle d'accès par rôle
  et par agence, journal d'audit, minimisation, aucun secret en dur).
- UI en français. Accessible et responsive.
- Avance LOT PAR LOT (voir feuille de route). À la fin de chaque lot : `pnpm build` doit passer,
  `pnpm lint` propre, et tu me donnes les critères de recette cochés.

Commence par le Lot 0 (scaffold + schéma Prisma + auth + seed) après mon GO.
```

---

## Conseils

- Donnez aussi les **5 captures d'écran** à Claude Code (glisser-déposer) : elles complètent le prototype.
- Si Active Directory / SharePoint ne sont pas prêts côté infra, demandez à Claude Code de
  **mocker les intégrations Microsoft Graph** derrière une interface, pour ne pas bloquer le développement.
- Le prototype `.jsx` n'est pas à réutiliser tel quel (styles en ligne) : il sert de **référence
  visuelle et fonctionnelle**. La cible production utilise Tailwind + shadcn/ui.
