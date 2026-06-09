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
| `AUTH_SECRET` | Secret de signature des sessions (`openssl rand -base64 32`) |
| `AUTH_URL` | URL publique de l'app (prod : `https://…vercel.app`) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Client ID Entra (vide si mode démo) |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client secret Entra (vide si mode démo) |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<TENANT>/v2.0` |
| `USE_INTEGRATION_MOCKS` | `true` = mocks (Entra/Graph) ; `false` = intégrations réelles |
| `CRON_SECRET` | Protège `/api/cron/*` **et** `/api/admin/seed` |

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

## Avancement (feuille de route)

Voir `docs/04_FEUILLE_DE_ROUTE.md`. Construction **lot par lot**.
