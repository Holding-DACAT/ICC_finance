/**
 * Agrégation du **pilotage commercial** (dashboard `/pilotage`).
 *
 * Récupère les données commerciales via le fournisseur Actelo (mock ou réel,
 * cf. `lib/integrations/actelo`) puis calcule, pour une période et des filtres
 * (agence / collaborateur) donnés :
 *   - les KPI (nombre de dossiers, CA / commissions, volume, taux de transfo) ;
 *   - la série temporelle à granularité adaptative ;
 *   - le classement des collaborateurs (leaderboard) ;
 *   - la répartition par statut ;
 *   - le suivi d'objectifs (objectif vs réalisé).
 *
 * L'API Actelo ne filtre pas les dossiers par agence/collaborateur : on borne
 * par date puis on agrège/filtre **côté serveur**. Le contrôle d'accès par
 * périmètre d'agence (CLAUDE.md §4/§5) est appliqué ici, jamais seulement dans
 * l'UI.
 */

import type { Role } from "@prisma/client";

import { getActeloProvider } from "@/lib/integrations/actelo";
import { prisma } from "@/lib/prisma";

// --------------------------------------------------------------------------
// Périodes
// --------------------------------------------------------------------------
export type PeriodKey =
  | "mois"
  | "mois-precedent"
  | "trimestre"
  | "annee-glissante"
  | "annee-civile";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "mois", label: "Mois en cours" },
  { key: "mois-precedent", label: "Mois précédent" },
  { key: "trimestre", label: "Trimestre en cours" },
  { key: "annee-glissante", label: "12 derniers mois" },
  { key: "annee-civile", label: "Année civile" },
];

export type Granularity = "semaine" | "mois";

export interface ResolvedPeriod {
  key: PeriodKey;
  label: string;
  from: Date;
  to: Date;
  granularity: Granularity;
}

export function resolvePeriod(key: PeriodKey): ResolvedPeriod {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const label = PERIODS.find((p) => p.key === key)?.label ?? "Période";

  let from: Date;
  let to: Date = endOfDay(now);

  switch (key) {
    case "mois":
      from = new Date(y, m, 1);
      break;
    case "mois-precedent":
      from = new Date(y, m - 1, 1);
      to = endOfDay(new Date(y, m, 0));
      break;
    case "trimestre": {
      const qStart = Math.floor(m / 3) * 3;
      from = new Date(y, qStart, 1);
      break;
    }
    case "annee-glissante":
      from = new Date(y, m - 11, 1);
      break;
    case "annee-civile":
      from = new Date(y, 0, 1);
      break;
    default:
      from = new Date(y, m, 1);
  }

  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  const granularity: Granularity = spanDays <= 100 ? "semaine" : "mois";
  return { key, label, from, to, granularity };
}

// --------------------------------------------------------------------------
// Statuts
// --------------------------------------------------------------------------
export type StatusGroup = "EN_COURS" | "ACCEPTE_FINANCE" | "REFUSE" | "ABANDONNE";

const FINANCE_STATUSES = new Set(["11_SIGNE"]);
const ACCEPTE_STATUSES = new Set([
  "05_ACCORDE",
  "06_RDV_BANQUE_EFFECTUE",
  "07_ATTENTE_ASSURANCE",
  "08_ATTENTE_EDITION",
  "09_DELAI_SCRIVENER",
  "10_ATTENTE_SIGNATURE",
]);
const REFUSE_STATUSES = new Set([
  "12_REFUSE",
  "121_REFUSE_CLIENT",
  "122_REFUSE_CHARGE",
  "123_ABSENCE_REPONSE_BANQUE",
]);
const ABANDONNE_STATUSES = new Set(["13_ANNULE", "15_CLOTURE"]);

export function statusGroup(status: string): StatusGroup {
  if (FINANCE_STATUSES.has(status) || ACCEPTE_STATUSES.has(status)) return "ACCEPTE_FINANCE";
  if (REFUSE_STATUSES.has(status)) return "REFUSE";
  if (ABANDONNE_STATUSES.has(status)) return "ABANDONNE";
  return "EN_COURS";
}

// --------------------------------------------------------------------------
// Types de sortie
// --------------------------------------------------------------------------
export interface PilotageFilters {
  period: PeriodKey;
  agencyId: string | null;
  collaboratorId: string | null;
}

export interface SelectOption {
  id: string;
  label: string;
}

export interface PilotageKpis {
  dossiersTotal: number;
  dossiersEnCours: number;
  dossiersFinances: number;
  volumeFinance: number;
  caCommissions: number;
  caPipeline: number;
  tauxTransformation: number; // 0..1
}

export interface SeriesPoint {
  label: string;
  dossiers: number;
  ca: number;
}

export interface StatusSlice {
  key: StatusGroup;
  label: string;
  count: number;
}

export interface LeaderRow {
  id: string;
  name: string;
  agencyName: string;
  dossiers: number;
  finances: number;
  ca: number;
  volume: number;
  taux: number; // 0..1
}

export interface ObjectiveState {
  source: "defined" | "indicative";
  targetCases: number;
  targetRevenue: number;
  attainmentCases: number; // 0..1+
  attainmentRevenue: number; // 0..1+
}

/** Origine des données affichées, pour diagnostiquer la connexion Actelo. */
export type DataSource = "live" | "mock" | "error";

export interface PilotageData {
  available: boolean;
  /** "live" = API Actelo, "mock" = démo, "error" = API configurée mais en échec. */
  source: DataSource;
  /** Motif d'erreur (sans secret) quand `source === "error"`. */
  errorMessage: string | null;
  period: { key: PeriodKey; label: string; from: string; to: string; granularity: Granularity };
  filters: PilotageFilters;
  agencies: SelectOption[];
  collaborators: SelectOption[];
  lockedAgencyId: string | null;
  kpis: PilotageKpis;
  series: SeriesPoint[];
  statusBreakdown: StatusSlice[];
  leaderboard: LeaderRow[];
  objective: ObjectiveState;
}

const STATUS_LABELS: Record<StatusGroup, string> = {
  EN_COURS: "En cours",
  ACCEPTE_FINANCE: "Accepté / Financé",
  REFUSE: "Refusé",
  ABANDONNE: "Abandonné / Sans suite",
};

// --------------------------------------------------------------------------
// Objectifs (stockés dans Setting → clé `pilotage.objectives`)
// --------------------------------------------------------------------------
export interface StoredObjective {
  id: string;
  label?: string;
  agencyId: string | null;
  collaboratorId: string | null;
  year: number;
  month: number | null; // 0..11, ou null pour un objectif annuel
  targetCases: number;
  targetRevenue: number;
}

export const OBJECTIVES_SETTING_KEY = "pilotage.objectives";

export async function getStoredObjectives(): Promise<StoredObjective[]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: OBJECTIVES_SETTING_KEY } });
    if (!row) return [];
    const value = row.value as unknown;
    return Array.isArray(value) ? (value as StoredObjective[]) : [];
  } catch {
    return [];
  }
}

/** Sélectionne l'objectif le plus spécifique correspondant au filtre + période. */
function matchObjective(
  objectives: StoredObjective[],
  filters: PilotageFilters,
  period: ResolvedPeriod,
): StoredObjective | null {
  const year = period.from.getFullYear();
  const singleMonth =
    period.from.getMonth() === period.to.getMonth() &&
    period.from.getFullYear() === period.to.getFullYear()
      ? period.from.getMonth()
      : null;

  const scoreScope = (o: StoredObjective): number => {
    if (filters.collaboratorId) {
      if (o.collaboratorId === filters.collaboratorId) return 3;
      return -1;
    }
    if (filters.agencyId) {
      if (o.agencyId === filters.agencyId && !o.collaboratorId) return 2;
      return -1;
    }
    return !o.agencyId && !o.collaboratorId ? 1 : -1;
  };

  const candidates = objectives
    .filter((o) => o.year === year && scoreScope(o) > 0)
    .filter((o) => (singleMonth !== null ? o.month === singleMonth || o.month === null : true))
    .sort((a, b) => scoreScope(b) - scoreScope(a) + ((b.month ?? -1) - (a.month ?? -1)));

  return candidates[0] ?? null;
}

// --------------------------------------------------------------------------
// Contrôle d'accès (périmètre agence)
// --------------------------------------------------------------------------
export interface ScopeUser {
  role: Role;
  scopedAgencyId: string | null;
}

/**
 * Résout le verrou de périmètre : un DIRECTEUR_AGENCE est restreint à sa seule
 * agence. Le rapprochement entre l'agence applicative (`scopedAgencyId`) et
 * l'agence Actelo se fait via la table de correspondance `pilotage.agencyMap`
 * (Setting) quand elle existe ; sinon on retombe sur l'identifiant tel quel.
 */
async function resolveLockedAgency(user: ScopeUser): Promise<string | null> {
  if (user.role !== "DIRECTEUR_AGENCE" || !user.scopedAgencyId) return null;
  try {
    const row = await prisma.setting.findUnique({ where: { key: "pilotage.agencyMap" } });
    const map = (row?.value ?? {}) as Record<string, string>;
    return map[user.scopedAgencyId] ?? user.scopedAgencyId;
  } catch {
    return user.scopedAgencyId;
  }
}

// --------------------------------------------------------------------------
// Séries temporelles
// --------------------------------------------------------------------------
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface Bucket {
  start: number;
  end: number;
  label: string;
}

function buildBuckets(period: ResolvedPeriod): Bucket[] {
  const buckets: Bucket[] = [];
  if (period.granularity === "mois") {
    const cursor = new Date(period.from.getFullYear(), period.from.getMonth(), 1);
    while (cursor <= period.to) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      buckets.push({ start: start.getTime(), end: end.getTime(), label: MONTHS_FR[cursor.getMonth()] });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    // Semaines glissantes (lundi → dimanche) couvrant la période.
    const first = new Date(period.from);
    const dow = (first.getDay() + 6) % 7; // 0 = lundi
    first.setDate(first.getDate() - dow);
    first.setHours(0, 0, 0, 0);
    const cursor = new Date(first);
    while (cursor <= period.to) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + 7);
      const d = start.getDate();
      buckets.push({
        start: start.getTime(),
        end: end.getTime(),
        label: `${d.toString().padStart(2, "0")}/${(start.getMonth() + 1).toString().padStart(2, "0")}`,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }
  return buckets;
}

// --------------------------------------------------------------------------
// Agrégation principale
// --------------------------------------------------------------------------
export async function getPilotageData(
  filters: PilotageFilters,
  user: ScopeUser,
): Promise<PilotageData> {
  const period = resolvePeriod(filters.period);
  const provider = getActeloProvider();

  const lockedAgencyId = await resolveLockedAgency(user);
  // Le verrou de périmètre l'emporte toujours sur le filtre choisi dans l'UI.
  const effectiveAgencyId = lockedAgencyId ?? filters.agencyId;

  try {
    const [agencies, users, cases, objectives] = await Promise.all([
      provider.listAgencies(),
      provider.listUsers(),
      provider.listCases({ from: period.from, to: period.to }),
      getStoredObjectives(),
    ]);

    // Options de filtres (collaborateurs restreints à l'agence sélectionnée).
    const visibleAgencies = lockedAgencyId
      ? agencies.filter((a) => a.id === lockedAgencyId)
      : agencies;
    // Le sélecteur « Agence » ne liste que les vraies agences-structures : dans
    // Actelo, chaque mandataire a sa propre « agence » individuelle (type
    // MANDATAIRE / `mandataryUserId` renseigné) — ce sont des collaborateurs, pas
    // des agences, donc on les exclut du filtre agence (ils restent dans le
    // filtre collaborateur). La correspondance des dossiers reste inchangée.
    const isStructuralAgency = (a: (typeof agencies)[number]) =>
      a.isActive !== false && a.type !== "MANDATAIRE" && !a.mandataryUserId;
    const agencyOptions: SelectOption[] = visibleAgencies
      .filter(isStructuralAgency)
      .map((a) => ({ id: a.id, label: a.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));

    const collaboratorOptions: SelectOption[] = users
      .filter((u) => (effectiveAgencyId ? u.agencyIds.includes(effectiveAgencyId) : true))
      .map((u) => ({ id: u.id, label: `${u.lastName} ${u.firstName}`.trim() }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));

    // Filtrage des dossiers selon le périmètre + filtres UI.
    const filtered = cases.filter((c) => {
      if (effectiveAgencyId && c.agencyId !== effectiveAgencyId) return false;
      if (filters.collaboratorId && c.managerId !== filters.collaboratorId) return false;
      return true;
    });

    // Un dossier compte dans la « période » via sa date de création.
    const createdInPeriod = filtered.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= period.from.getTime() && t <= period.to.getTime();
    });
    // Le CA/volume est reconnu à la signature, dans la période.
    const signedInPeriod = filtered.filter((c) => {
      if (!c.signDate) return false;
      const t = new Date(c.signDate).getTime();
      return t >= period.from.getTime() && t <= period.to.getTime();
    });

    // KPI ---------------------------------------------------------------
    const dossiersTotal = createdInPeriod.length;
    const dossiersEnCours = createdInPeriod.filter((c) => statusGroup(c.status) === "EN_COURS").length;
    const dossiersFinances = signedInPeriod.length;
    const volumeFinance = signedInPeriod.reduce((s, c) => s + c.amountBorrowed, 0);
    const caCommissions = signedInPeriod.reduce((s, c) => s + c.brokerCommission, 0);
    const caPipeline = createdInPeriod
      .filter((c) => {
        const g = statusGroup(c.status);
        return g === "EN_COURS" || g === "ACCEPTE_FINANCE";
      })
      .reduce((s, c) => s + c.brokerCommission, 0);
    const tauxTransformation = dossiersTotal > 0 ? dossiersFinances / dossiersTotal : 0;

    const kpis: PilotageKpis = {
      dossiersTotal,
      dossiersEnCours,
      dossiersFinances,
      volumeFinance,
      caCommissions,
      caPipeline,
      tauxTransformation,
    };

    // Répartition par statut (sur les dossiers créés dans la période) --------
    const statusOrder: StatusGroup[] = ["EN_COURS", "ACCEPTE_FINANCE", "REFUSE", "ABANDONNE"];
    const counts = new Map<StatusGroup, number>();
    for (const c of createdInPeriod) {
      const g = statusGroup(c.status);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const statusBreakdown: StatusSlice[] = statusOrder.map((key) => ({
      key,
      label: STATUS_LABELS[key],
      count: counts.get(key) ?? 0,
    }));

    // Série temporelle (dossiers créés = barres ; CA signé = courbe) ---------
    const buckets = buildBuckets(period);
    const series: SeriesPoint[] = buckets.map((b) => {
      let dossiers = 0;
      let ca = 0;
      for (const c of createdInPeriod) {
        const t = new Date(c.createdAt).getTime();
        if (t >= b.start && t < b.end) dossiers++;
      }
      for (const c of signedInPeriod) {
        const t = c.signDate ? new Date(c.signDate).getTime() : NaN;
        if (t >= b.start && t < b.end) ca += c.brokerCommission;
      }
      return { label: b.label, dossiers, ca };
    });

    // Leaderboard collaborateurs -------------------------------------------
    const userName = new Map(users.map((u) => [u.id, `${u.lastName} ${u.firstName}`.trim()]));
    const agencyName = new Map(agencies.map((a) => [a.id, a.name]));
    const byManager = new Map<string, LeaderRow>();
    for (const c of createdInPeriod) {
      const key = c.managerId ?? "—";
      const row =
        byManager.get(key) ??
        ({
          id: key,
          name: c.managerName ?? userName.get(key) ?? "—",
          agencyName: c.agencyName ?? (c.agencyId ? agencyName.get(c.agencyId) ?? "—" : "—"),
          dossiers: 0,
          finances: 0,
          ca: 0,
          volume: 0,
          taux: 0,
        } satisfies LeaderRow);
      row.dossiers++;
      byManager.set(key, row);
    }
    for (const c of signedInPeriod) {
      const key = c.managerId ?? "—";
      const row = byManager.get(key);
      if (!row) continue;
      row.finances++;
      row.ca += c.brokerCommission;
      row.volume += c.amountBorrowed;
    }
    const leaderboard = [...byManager.values()]
      .map((r) => ({ ...r, taux: r.dossiers > 0 ? r.finances / r.dossiers : 0 }))
      .sort((a, b) => b.ca - a.ca);

    // Objectif vs réalisé ---------------------------------------------------
    const matched = matchObjective(objectives, filters, period);
    const objective: ObjectiveState = matched
      ? {
          source: "defined",
          targetCases: matched.targetCases,
          targetRevenue: matched.targetRevenue,
          attainmentCases: matched.targetCases > 0 ? dossiersTotal / matched.targetCases : 0,
          attainmentRevenue: matched.targetRevenue > 0 ? caCommissions / matched.targetRevenue : 0,
        }
      : indicativeObjective(dossiersTotal, caCommissions);

    return {
      available: true,
      source: provider.kind === "live" ? "live" : "mock",
      errorMessage: null,
      period: {
        key: period.key,
        label: period.label,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        granularity: period.granularity,
      },
      filters: { ...filters, agencyId: effectiveAgencyId },
      agencies: agencyOptions,
      collaborators: collaboratorOptions,
      lockedAgencyId,
      kpis,
      series,
      statusBreakdown,
      leaderboard,
      objective,
    };
  } catch (error) {
    // Une erreur alors que le fournisseur est « live » = problème de connexion
    // Actelo (token, schéma d'auth, réseau) : on le signale explicitement plutôt
    // que de retomber silencieusement sur un état « démo » trompeur.
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return emptyData(filters, period, provider.kind === "live" ? "error" : "mock", message);
  }
}

/** Objectif « indicatif » quand aucun objectif n'est défini (démo / repère). */
function indicativeObjective(dossiers: number, ca: number): ObjectiveState {
  const targetCases = Math.max(5, Math.ceil((dossiers * 1.15) / 5) * 5);
  const targetRevenue = Math.max(10_000, Math.ceil((ca * 1.15) / 5000) * 5000);
  return {
    source: "indicative",
    targetCases,
    targetRevenue,
    attainmentCases: targetCases > 0 ? dossiers / targetCases : 0,
    attainmentRevenue: targetRevenue > 0 ? ca / targetRevenue : 0,
  };
}

function emptyData(
  filters: PilotageFilters,
  period: ResolvedPeriod,
  source: DataSource = "mock",
  errorMessage: string | null = null,
): PilotageData {
  return {
    available: false,
    source,
    errorMessage,
    period: {
      key: period.key,
      label: period.label,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      granularity: period.granularity,
    },
    filters,
    agencies: [],
    collaborators: [],
    lockedAgencyId: null,
    kpis: {
      dossiersTotal: 0,
      dossiersEnCours: 0,
      dossiersFinances: 0,
      volumeFinance: 0,
      caCommissions: 0,
      caPipeline: 0,
      tauxTransformation: 0,
    },
    series: [],
    statusBreakdown: [],
    leaderboard: [],
    objective: {
      source: "indicative",
      targetCases: 0,
      targetRevenue: 0,
      attainmentCases: 0,
      attainmentRevenue: 0,
    },
  };
}

/** Normalise les paramètres d'URL en filtres typés. */
export function parseFilters(searchParams: Record<string, string | string[] | undefined>): PilotageFilters {
  const get = (k: string): string | null => {
    const v = searchParams[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length ? s : null;
  };
  const periodRaw = get("periode");
  const period = (PERIODS.find((p) => p.key === periodRaw)?.key ?? "mois") as PeriodKey;
  return {
    period,
    agencyId: get("agence"),
    collaboratorId: get("collaborateur"),
  };
}
