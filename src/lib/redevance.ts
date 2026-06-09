import { prisma } from "@/lib/prisma";

export interface RedevanceParams {
  silverHT: number;
  goldHT: number;
  tvaRate: number;
}

export interface RedevanceRow {
  agencyId: string;
  agencyName: string;
  silver: number;
  gold: number;
  silverHT: number;
  goldHT: number;
  totalHT: number;
  totalTTC: number;
  avgPerPersonHT: number;
  avgPerPersonTTC: number;
}

export interface RedevanceTotals {
  silver: number;
  gold: number;
  totalHT: number;
  totalTTC: number;
  avgPerAgencyHT: number;
  avgPerAgencyTTC: number;
}

export interface RedevanceResult {
  params: RedevanceParams;
  rows: RedevanceRow[];
  totals: RedevanceTotals;
  available: boolean;
}

const DEFAULTS: RedevanceParams = { silverHT: 58.33, goldHT: 112.5, tvaRate: 0.2 };

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

/**
 * Redevance par agence (cf. docs/02). Les compteurs Silver/Gold proviennent du
 * paramètre `redevance.seedCounts` s'il existe, sinon des licences des postes.
 * Les agences `redevanceExcluded` (« sans ICC Dev. ») sont exclues.
 */
export async function getRedevanceData(): Promise<RedevanceResult> {
  try {
    const [settings, agencies, computers] = await Promise.all([
      prisma.setting.findMany({
        where: {
          key: { in: ["redevance.silverHT", "redevance.goldHT", "redevance.tvaRate", "redevance.seedCounts"] },
        },
      }),
      prisma.agency.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, redevanceExcluded: true },
      }),
      prisma.computer.findMany({
        where: { licenseTier: { not: null }, assignedMember: { isNot: null } },
        select: { licenseTier: true, assignedMember: { select: { agencyId: true } } },
      }),
    ]);

    const settingMap = new Map(settings.map((s) => [s.key, s.value]));
    const params: RedevanceParams = {
      silverHT: num(settingMap.get("redevance.silverHT"), DEFAULTS.silverHT),
      goldHT: num(settingMap.get("redevance.goldHT"), DEFAULTS.goldHT),
      tvaRate: num(settingMap.get("redevance.tvaRate"), DEFAULTS.tvaRate),
    };

    const seedCounts = settingMap.get("redevance.seedCounts") as
      | Record<string, [number, number]>
      | undefined;

    // Compteurs dérivés des licences si pas de seedCounts.
    const derived = new Map<string, { silver: number; gold: number }>();
    for (const c of computers) {
      const agencyId = c.assignedMember?.agencyId;
      if (!agencyId) continue;
      const entry = derived.get(agencyId) ?? { silver: 0, gold: 0 };
      if (c.licenseTier === "GOLD") entry.gold++;
      else if (c.licenseTier === "SILVER") entry.silver++;
      derived.set(agencyId, entry);
    }

    const rows: RedevanceRow[] = agencies
      .filter((a) => !a.redevanceExcluded)
      .map((a) => {
        const counts = seedCounts?.[a.name]
          ? { silver: seedCounts[a.name][0], gold: seedCounts[a.name][1] }
          : (derived.get(a.id) ?? { silver: 0, gold: 0 });
        const silverHT = counts.silver * params.silverHT;
        const goldHT = counts.gold * params.goldHT;
        const totalHT = silverHT + goldHT;
        const totalTTC = totalHT * (1 + params.tvaRate);
        const persons = counts.silver + counts.gold;
        return {
          agencyId: a.id,
          agencyName: a.name,
          silver: counts.silver,
          gold: counts.gold,
          silverHT,
          goldHT,
          totalHT,
          totalTTC,
          avgPerPersonHT: persons ? totalHT / persons : 0,
          avgPerPersonTTC: persons ? totalTTC / persons : 0,
        };
      });

    const totalHT = rows.reduce((s, r) => s + r.totalHT, 0);
    const totals: RedevanceTotals = {
      silver: rows.reduce((s, r) => s + r.silver, 0),
      gold: rows.reduce((s, r) => s + r.gold, 0),
      totalHT,
      totalTTC: totalHT * (1 + params.tvaRate),
      avgPerAgencyHT: rows.length ? totalHT / rows.length : 0,
      avgPerAgencyTTC: rows.length ? (totalHT * (1 + params.tvaRate)) / rows.length : 0,
    };

    return { params, rows, totals, available: true };
  } catch {
    return {
      params: DEFAULTS,
      rows: [],
      totals: { silver: 0, gold: 0, totalHT: 0, totalTTC: 0, avgPerAgencyHT: 0, avgPerAgencyTTC: 0 },
      available: false,
    };
  }
}
