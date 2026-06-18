# GESTION RH — ICC Finance

Application web interne de gestion **RH / IT** du réseau ICC Finance (membres,
parc informatique, redevances logicielles, formations, immatriculations ORIAS).

Stack : **Next.js (App Router) + TypeScript** · **Tailwind + shadcn/ui** ·
**Prisma + PostgreSQL (Neon)** · **Auth.js (NextAuth v5) + Microsoft Entra ID** ·
hébergement **Vercel**. Voir `CLAUDE.md` et `docs/` pour le détail fonctionnel.

## Démarrage local

```bash
pnpm install
cp .env.example .env        # puis renseigner les valeurs (ne pas committer)
pnpm prisma migrate deploy  # applique les migrations sur la base Neon
pnpm db:seed                # charge le jeu de données de démo
pnpm dev                    # http://localhost:3000
```

En **mode démo** (`USE_INTEGRATION_MOCKS=true`), la connexion se fait sans tenant
Azure : un bouton « Se connecter (mode démo) » ouvre une session administrateur.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | PostgreSQL Neon **pooled** (hôte en `-pooler`) — runtime |
| `DIRECT_URL` | PostgreSQL Neon **direct** — migrations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk (Dashboard → API Keys) |
| `CLERK_SECRET_KEY` | Clé secrète Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `USE_INTEGRATION_MOCKS` | `true` = mocks (Graph) ; `false` = intégrations réelles |
| `CRON_SECRET` | Protège `/api/cron/*` **et** `/api/admin/seed` |

### Authentification & rôles (Clerk)

L'authentification est gérée par **Clerk** (connexion par e-mail, comptes créés
**par invitation**). Pour restreindre l'accès, active *« Restrict sign-ups »* dans
le tableau de bord Clerk : seuls les e-mails invités peuvent activer un compte.

Les **rôles applicatifs** sont stockés dans le `publicMetadata` de chaque
utilisateur Clerk (Dashboard → Users → *Metadata* → *Public*) :

```json
{ "role": "ADMIN", "scopedAgencyId": null }
```

Rôles possibles : `ADMIN`, `RH`, `IT`, `DIRECTEUR_AGENCE`, `LECTURE`. Pour un
`DIRECTEUR_AGENCE`, renseigner `scopedAgencyId` avec l'id de son agence. En
l'absence de rôle, l'utilisateur est en **LECTURE** (moindre privilège).

## Déploiement Vercel + Neon

- Renseigner les variables ci-dessus dans **Vercel → Settings → Environment Variables**.
- La commande de build (`vercel.json`) exécute `prisma generate && prisma migrate deploy && next build` :
  les migrations sont appliquées automatiquement à chaque déploiement.
- Les tâches planifiées sont déclarées dans `vercel.json` (Vercel Cron), endpoints
  `/api/cron/*` protégés par `CRON_SECRET`.

### Lancer le seed sans terminal (sur Vercel)

```bash
curl -X POST "https://VOTRE-APP/api/admin/seed" -H "Authorization: Bearer $CRON_SECRET"
```

## Commandes

| Commande | Description |
|---|---|
| `pnpm dev` | Développement |
| `pnpm build` | Build de production (`prisma generate && next build`) |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Migration de dev (`prisma migrate dev`) |
| `pnpm db:deploy` | Applique les migrations (`prisma migrate deploy`) |
| `pnpm db:seed` | Charge les données de démo |

## Espace import (Liste du Réseau)

Page **`/import`** (réservée aux rôles **ADMIN** / **RH**) : intégration du fichier
Excel/CSV « Liste du Réseau » transmis par le groupe pour alimenter la base des
**membres** et des **agences**.

- Formats acceptés : `.xlsx`, `.xls`, `.csv` (feuille « Liste réseau » détectée
  automatiquement). En-têtes tolérantes aux accents/casse.
- Flux en deux temps : **Analyser** (dry-run, aperçu ligne par ligne avec statut
  Création / Mise à jour / Ignorée / Erreur) puis **Intégrer** (écriture en base).
- Idempotent : les membres sont rapprochés par **e-mail** (upsert), les agences par
  **nom** ; une nouvelle exécution ne crée pas de doublon.
- Mapping : `Statut` → fonction, `Fonction` → sous-fonction + catégories ORIAS,
  `Date départ` → statut INACTIF, `ORIAS`/`N°RCPRO` → inscription ORIAS.
- **Sécurité/RGPD** : les colonnes de mots de passe (Orias/Afib/Votrasso) ne sont
  **jamais** importées ni stockées ; chaque import est tracé dans le journal d'audit.

## Avancement (feuille de route)

Voir `docs/04_FEUILLE_DE_ROUTE.md`. Construction **lot par lot**.
