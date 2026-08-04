/**
 * Implémentation **réelle** du fournisseur Actelo (cf. `types.ts`).
 *
 * Interroge l'API `https://api.actelo.fr` (OpenAPI v1). Le schéma
 * d'authentification est **configurable** sans refonte, car il n'était pas connu
 * au moment du développement :
 *   - `ACTELO_API_TOKEN`    : le jeton (obligatoire) — jamais en dur (CLAUDE.md §4).
 *   - `ACTELO_API_BASE_URL` : défaut `https://api.actelo.fr`.
 *   - `ACTELO_AUTH_HEADER`  : défaut `Authorization`.
 *   - `ACTELO_AUTH_PREFIX`  : défaut `Bearer ` (mettre "" pour un en-tête type X-API-Key).
 *
 * Ce module n'est jamais importé côté client (secrets serveur uniquement).
 */

import type {
  ActeloAgency,
  ActeloCase,
  ActeloProvider,
  ActeloUser,
  CaseQuery,
} from "./types";

const PAGE_SIZE = 100; // maximum autorisé par l'API.
const MAX_PAGES = 400; // garde-fou anti-boucle (jusqu'à 40 000 enregistrements).
const CONCURRENCY = 8; // pages récupérées en parallèle (réduit le temps total).

interface ActeloConfig {
  baseUrl: string;
  token: string;
  authHeader: string;
  authPrefix: string;
}

/**
 * Résout le préfixe d'authentification. Défaut : `Bearer `. Actelo attend le
 * token brut (`Authorization: <token>`, sans préfixe) : comme Vercel n'accepte
 * pas toujours une variable à valeur vide, les valeurs `none` / `vide` / `empty`
 * sont interprétées comme « aucun préfixe ».
 */
function resolveAuthPrefix(): string {
  const raw = process.env.ACTELO_AUTH_PREFIX;
  if (raw === undefined) return "Bearer ";
  if (["none", "vide", "empty", "raw"].includes(raw.trim().toLowerCase())) return "";
  return raw;
}

function readConfig(): ActeloConfig {
  const token = process.env.ACTELO_API_TOKEN;
  if (!token) {
    throw new Error(
      "ACTELO_API_TOKEN manquant : renseignez-le (ou activez USE_INTEGRATION_MOCKS=true).",
    );
  }
  return {
    baseUrl: (process.env.ACTELO_API_BASE_URL ?? "https://api.actelo.fr").replace(/\/$/, ""),
    token,
    authHeader: process.env.ACTELO_AUTH_HEADER ?? "Authorization",
    authPrefix: resolveAuthPrefix(),
  };
}

async function acteloFetch<T>(
  cfg: ActeloConfig,
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${cfg.baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: {
      [cfg.authHeader]: `${cfg.authPrefix}${cfg.token}`,
      Accept: "application/json",
    },
    // Cache court (15 min) — cf. choix produit. Revalidation ISR côté serveur.
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    throw new Error(`Actelo ${path} → HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// --- Schémas bruts (partiels) renvoyés par l'API ----------------------------
interface RawList<T> {
  results?: T[];
  body?: T[];
  count?: number;
}

interface RawAgency {
  _id: string;
  name?: string;
  type?: string;
  isActive?: boolean;
  parentAgencyId?: string | null;
  mandataryUserId?: string | null;
}

interface RawUser {
  _id: string;
  profile?: {
    name?: { first?: string; last?: string };
    type?: string;
    isActive?: boolean;
    favoriteAgency?: { _id?: string } | null;
    agencies?: Array<{ _id?: string }>;
  };
}

interface RawCase {
  _id: string;
  ref?: string | null;
  status?: string;
  managerId?: string | null;
  managerFullName_d?: string | null;
  agencyName_d?: string | null;
  amountBorrowed_d?: number | null;
  brokerCommission_d?: number | null;
  meta_parent?: { agencyId?: string | null };
  meta_created?: { at?: string | null };
  stageDates?: { signDate?: string | null };
}

// --- Projections brut → DTO -------------------------------------------------
const toAgency = (a: RawAgency): ActeloAgency => ({
  id: a._id,
  name: a.name ?? "—",
  type: a.type ?? "CLASSIQUE",
  isActive: a.isActive ?? true,
  parentAgencyId: a.parentAgencyId ?? null,
  mandataryUserId: a.mandataryUserId ?? null,
});

const toUser = (u: RawUser): ActeloUser => {
  const agencyIds = (u.profile?.agencies ?? [])
    .map((a) => a._id)
    .filter((id): id is string => Boolean(id));
  const favorite = u.profile?.favoriteAgency?._id ?? null;
  return {
    id: u._id,
    firstName: u.profile?.name?.first ?? "",
    lastName: u.profile?.name?.last ?? "",
    type: u.profile?.type ?? "SALARIE",
    isActive: u.profile?.isActive ?? true,
    agencyIds: agencyIds.length ? agencyIds : favorite ? [favorite] : [],
    primaryAgencyId: favorite ?? agencyIds[0] ?? null,
  };
};

// Actelo exprime tous les montants en **centimes** (ex. amountBorrowed_d
// 34255556 = 342 555,56 €). On convertit en euros à la frontière.
const centsToEur = (v: number | null | undefined): number => (v ?? 0) / 100;

const toCase = (c: RawCase): ActeloCase => ({
  id: c._id,
  ref: c.ref ?? null,
  status: c.status ?? "000_OUVERTURE",
  agencyId: c.meta_parent?.agencyId ?? null,
  agencyName: c.agencyName_d ?? null,
  managerId: c.managerId ?? null,
  managerName: c.managerFullName_d ?? null,
  amountBorrowed: centsToEur(c.amountBorrowed_d),
  brokerCommission: centsToEur(c.brokerCommission_d),
  createdAt: c.meta_created?.at ?? new Date(0).toISOString(),
  signDate: c.stageDates?.signDate ?? null,
});

const rows = <T>(d: RawList<T>): T[] => d.results ?? d.body ?? [];

/**
 * Parcourt toutes les pages d'un endpoint paginé (`limit`/`skip`).
 *
 * Performance : la première page fournit `count` (total), ce qui permet de
 * récupérer les pages suivantes **en parallèle** (par lots de `CONCURRENCY`) au
 * lieu d'un aller-retour série par page — c'est le principal gain de temps
 * d'affichage. `skip` est omis pour la 1re page (Actelo exige `skip > 0`).
 */
async function paginate<T>(
  cfg: ActeloConfig,
  path: string,
  extra: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const first = await acteloFetch<RawList<T>>(cfg, path, { ...extra, limit: PAGE_SIZE });
  const firstRows = rows(first);
  const out: T[] = [...firstRows];
  if (firstRows.length < PAGE_SIZE) return out;

  const total = typeof first.count === "number" && first.count > 0 ? first.count : undefined;
  const totalPages = total ? Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES) : MAX_PAGES;

  const pageIndexes: number[] = [];
  for (let p = 1; p < totalPages; p++) pageIndexes.push(p);

  for (let i = 0; i < pageIndexes.length; i += CONCURRENCY) {
    const slice = pageIndexes.slice(i, i + CONCURRENCY);
    const batches = await Promise.all(
      slice.map((p) =>
        acteloFetch<RawList<T>>(cfg, path, { ...extra, limit: PAGE_SIZE, skip: p * PAGE_SIZE }),
      ),
    );
    let reachedEnd = false;
    for (const b of batches) {
      const arr = rows(b);
      out.push(...arr);
      if (arr.length < PAGE_SIZE) reachedEnd = true;
    }
    // Quand `count` est inconnu, on s'arrête dès qu'une page est incomplète.
    if (!total && reachedEnd) break;
  }
  return out;
}

export const liveActeloProvider: ActeloProvider = {
  kind: "live",

  async listAgencies() {
    const cfg = readConfig();
    const raw = await paginate<RawAgency>(cfg, "/api/v1/agencies");
    return raw.map(toAgency);
  },

  async listUsers(params) {
    const cfg = readConfig();
    const raw = await paginate<RawUser>(cfg, "/api/v1/users", { agencyId: params?.agencyId });
    return raw.map(toUser);
  },

  async listCases(query: CaseQuery) {
    const cfg = readConfig();
    // L'API ne filtre pas par agence/collaborateur : on borne par date de
    // création et on agrège/filtre côté serveur (cf. src/lib/pilotage.ts).
    const raw = await paginate<RawCase>(cfg, "/api/v1/cases", {
      createdAtStart: query.from.toISOString(),
      createdAtEnd: query.to.toISOString(),
      active: "true",
    });
    return raw.map(toCase);
  },
};
