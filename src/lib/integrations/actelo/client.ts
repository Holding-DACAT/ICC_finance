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
const MAX_PAGES = 100; // garde-fou anti-boucle (10 000 dossiers max par fenêtre).

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

const toCase = (c: RawCase): ActeloCase => ({
  id: c._id,
  ref: c.ref ?? null,
  status: c.status ?? "000_OUVERTURE",
  agencyId: c.meta_parent?.agencyId ?? null,
  agencyName: c.agencyName_d ?? null,
  managerId: c.managerId ?? null,
  managerName: c.managerFullName_d ?? null,
  amountBorrowed: c.amountBorrowed_d ?? 0,
  brokerCommission: c.brokerCommission_d ?? 0,
  createdAt: c.meta_created?.at ?? new Date(0).toISOString(),
  signDate: c.stageDates?.signDate ?? null,
});

/** Parcourt toutes les pages d'un endpoint paginé (`limit`/`skip`). */
async function paginate<T>(
  cfg: ActeloConfig,
  path: string,
  extra: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await acteloFetch<RawList<T>>(cfg, path, {
      ...extra,
      limit: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    });
    const batch = data.results ?? data.body ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
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
