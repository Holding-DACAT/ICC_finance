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

import { getActeloProvider, type ActeloCase } from "@/lib/integrations/actelo";
import { prisma } from "@/lib/prisma";

// --------------------------------------------------------------------------
// Périodes
// --------------------------------------------------------------------------
export type PeriodKey =
  | "mois"
  | "mois-precedent"
  | "trimestre"
  | "annee-glissante"
  | "annee-civile"
  | "annee-precedente"
  | "tout"
  | "perso";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "mois", label: "Mois en cours" },
  { key: "mois-precedent", label: "Mois précédent" },
  { key: "trimestre", label: "Trimestre en cours" },
  { key: "annee-glissante", label: "12 derniers mois" },
  { key: "annee-civile", label: "Année civile" },
  { key: "annee-precedente", label: "Année précédente" },
  { key: "tout", label: "Tout l'historique" },
];

/** Début de l'historique retenu pour le préréglage « Tout l'historique ». */
const HISTORY_START = new Date(2015, 0, 1);

export type Granularity = "semaine" | "mois" | "annee";

export interface ResolvedPeriod {
  key: PeriodKey;
  label: string;
  from: Date;
  to: Date;
  granularity: Granularity;
}

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const parseDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Résout la fenêtre temporelle. Une plage personnalisée (`from`/`to` issus des
 * champs de date) l'emporte sur le préréglage. La granularité s'adapte à la
 * durée (semaine / mois / année).
 */
export function resolvePeriod(
  key: PeriodKey,
  fromStr?: string | null,
  toStr?: string | null,
): ResolvedPeriod {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const customFrom = parseDate(fromStr);
  const customTo = parseDate(toStr);

  let from: Date;
  let to: Date = endOfDay(now);
  let label: string;
  let resolvedKey: PeriodKey = key;

  if (customFrom || customTo) {
    from = customFrom ? startOfDay(customFrom) : HISTORY_START;
    to = customTo ? endOfDay(customTo) : endOfDay(now);
    resolvedKey = "perso";
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    label = `Du ${fmt(from)} au ${fmt(to)}`;
  } else {
    label = PERIODS.find((p) => p.key === key)?.label ?? "Période";
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
      case "annee-precedente":
        from = new Date(y - 1, 0, 1);
        to = endOfDay(new Date(y - 1, 11, 31));
        break;
      case "tout":
        from = HISTORY_START;
        break;
      default:
        from = new Date(y, m, 1);
    }
  }

  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  const granularity: Granularity = spanDays <= 100 ? "semaine" : spanDays <= 800 ? "mois" : "annee";
  return { key: resolvedKey, label, from, to, granularity };
}

// --------------------------------------------------------------------------
// Référence de date (quelle date rattache un dossier à la période)
// --------------------------------------------------------------------------
export type DateRef = "creation" | "signature" | "mandat" | "accord" | "edition";

export const DATE_REFS: { key: DateRef; label: string }[] = [
  { key: "creation", label: "Date de création" },
  { key: "signature", label: "Date de signature" },
  { key: "mandat", label: "Date de mandat" },
  { key: "accord", label: "Date d'accord banque" },
  { key: "edition", label: "Date d'édition" },
];

/** Date d'un dossier selon la référence choisie (null si absente). */
function referenceDateStr(c: ActeloCase, ref: DateRef): string | null {
  switch (ref) {
    case "signature":
      return c.signDate;
    case "mandat":
      return c.mandateDate;
    case "accord":
      return c.agreementDate;
    case "edition":
      return c.editionDate;
    case "creation":
    default:
      return c.createdAt;
  }
}

/**
 * Marge de création à remonter quand la référence n'est PAS la création :
 * l'API ne filtre que par date de création, or un dossier signé/édité dans la
 * période a pu être créé bien avant. On élargit donc la fenêtre de création.
 */
const LOOKBACK_MONTHS = 24;

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
  /** Agences sélectionnées (multi). Vide = toutes. */
  agencyIds: string[];
  /** Collaborateurs sélectionnés (multi). Vide = tous. */
  collaboratorIds: string[];
  /** Bornes de dates personnalisées (ISO `yyyy-mm-dd`), prioritaires sur `period`. */
  from: string | null;
  to: string | null;
  /** Date de référence appliquée à la période (création par défaut). */
  dateRef: DateRef;
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

  // L'objectif se rapproche quand la sélection cible une seule agence ou un seul
  // collaborateur ; en multi-sélection on retombe sur l'objectif « réseau ».
  const singleCollaborator = filters.collaboratorIds.length === 1 ? filters.collaboratorIds[0] : null;
  const singleAgency =
    filters.agencyIds.length === 1 && filters.collaboratorIds.length === 0 ? filters.agencyIds[0] : null;

  const scoreScope = (o: StoredObjective): number => {
    if (singleCollaborator) {
      if (o.collaboratorId === singleCollaborator) return 3;
      return -1;
    }
    if (singleAgency) {
      if (o.agencyId === singleAgency && !o.collaboratorId) return 2;
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
  if (period.granularity === "annee") {
    for (let y = period.from.getFullYear(); y <= period.to.getFullYear(); y++) {
      const start = new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1);
      buckets.push({ start: start.getTime(), end: end.getTime(), label: String(y) });
    }
  } else if (period.granularity === "mois") {
    const cursor = new Date(period.from.getFullYear(), period.from.getMonth(), 1);
    while (cursor <= period.to) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      // Sur une longue période, préciser l'année (ex. « Jan 24 »).
      const label = `${MONTHS_FR[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`;
      buckets.push({ start: start.getTime(), end: end.getTime(), label });
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
  const period = resolvePeriod(filters.period, filters.from, filters.to);
  const provider = getActeloProvider();

  const lockedAgencyId = await resolveLockedAgency(user);
  // Le verrou de périmètre l'emporte toujours sur les filtres choisis dans l'UI.
  const effectiveAgencyIds = lockedAgencyId ? [lockedAgencyId] : filters.agencyIds;
  const agencySet = new Set(effectiveAgencyIds);
  const collaboratorSet = new Set(filters.collaboratorIds);

  // L'API ne filtre que par date de création : si la référence n'est pas la
  // création, on élargit la fenêtre de création récupérée puis on filtre côté
  // serveur sur la date de référence choisie.
  const creationFrom =
    filters.dateRef === "creation"
      ? period.from
      : new Date(
          period.from.getFullYear(),
          period.from.getMonth() - LOOKBACK_MONTHS,
          period.from.getDate(),
        );

  try {
    const [agencies, users, cases, objectives] = await Promise.all([
      provider.listAgencies(),
      provider.listUsers(),
      provider.listCases({ from: creationFrom, to: period.to }),
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
      .filter((u) => (agencySet.size ? u.agencyIds.some((id) => agencySet.has(id)) : true))
      .map((u) => ({ id: u.id, label: `${u.lastName} ${u.firstName}`.trim() }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));

    // Filtrage des dossiers selon le périmètre + filtres UI (multi-sélection :
    // un ensemble vide = « tous »).
    const filtered = cases.filter((c) => {
      if (agencySet.size && (!c.agencyId || !agencySet.has(c.agencyId))) return false;
      if (collaboratorSet.size && (!c.managerId || !collaboratorSet.has(c.managerId))) return false;
      return true;
    });

    // Timestamp de référence d'un dossier (selon la date choisie : création,
    // signature, mandat…). Null si la date n'existe pas pour ce dossier.
    const refTime = (c: ActeloCase): number | null => {
      const s = referenceDateStr(c, filters.dateRef);
      if (!s) return null;
      const t = new Date(s).getTime();
      return Number.isNaN(t) ? null : t;
    };

    // Un dossier compte dans la période si sa date de référence y tombe.
    const inPeriod = filtered.filter((c) => {
      const t = refTime(c);
      return t !== null && t >= period.from.getTime() && t <= period.to.getTime();
    });
    // Dossiers signés (statut `11_SIGNE`) dans la période → CA / volume.
    const financedInPeriod = inPeriod.filter((c) => FINANCE_STATUSES.has(c.status));

    // KPI ---------------------------------------------------------------
    const dossiersTotal = inPeriod.length;
    const dossiersEnCours = inPeriod.filter((c) => statusGroup(c.status) === "EN_COURS").length;
    const dossiersFinances = financedInPeriod.length;
    const volumeFinance = financedInPeriod.reduce((s, c) => s + c.amountBorrowed, 0);
    const caCommissions = financedInPeriod.reduce((s, c) => s + c.brokerCommission, 0);
    // Pipeline = commissions attendues sur les dossiers en cours / acceptés mais
    // pas encore signés (ni refusés ni abandonnés).
    const caPipeline = inPeriod
      .filter((c) => {
        if (FINANCE_STATUSES.has(c.status)) return false;
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
    for (const c of inPeriod) {
      const g = statusGroup(c.status);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const statusBreakdown: StatusSlice[] = statusOrder.map((key) => ({
      key,
      label: STATUS_LABELS[key],
      count: counts.get(key) ?? 0,
    }));

    // Série temporelle (barres = dossiers créés ; courbe = CA des dossiers
    // signés), le tout rattaché à la date de création.
    const buckets = buildBuckets(period);
    const series: SeriesPoint[] = buckets.map((b) => {
      let dossiers = 0;
      let ca = 0;
      for (const c of inPeriod) {
        const t = refTime(c);
        if (t !== null && t >= b.start && t < b.end) {
          dossiers++;
          if (FINANCE_STATUSES.has(c.status)) ca += c.brokerCommission;
        }
      }
      return { label: b.label, dossiers, ca };
    });

    // Leaderboard collaborateurs -------------------------------------------
    const userName = new Map(users.map((u) => [u.id, `${u.lastName} ${u.firstName}`.trim()]));
    const agencyName = new Map(agencies.map((a) => [a.id, a.name]));
    const byManager = new Map<string, LeaderRow>();
    for (const c of inPeriod) {
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
    for (const c of financedInPeriod) {
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
      filters: { ...filters, agencyIds: effectiveAgencyIds },
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
  // Listes séparées par des virgules (multi-sélection).
  const getList = (k: string): string[] => {
    const raw = get(k);
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  };
  // Date `yyyy-mm-dd` (issue d'un <input type="date">) validée sommairement.
  const getDate = (k: string): string | null => {
    const raw = get(k);
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  };

  const periodRaw = get("periode");
  const period = (PERIODS.find((p) => p.key === periodRaw)?.key ?? "mois") as PeriodKey;
  const refRaw = get("ref");
  const dateRef = (DATE_REFS.find((r) => r.key === refRaw)?.key ?? "creation") as DateRef;
  return {
    period,
    agencyIds: getList("agence"),
    collaboratorIds: getList("collaborateur"),
    from: getDate("du"),
    to: getDate("au"),
    dateRef,
  };
}
