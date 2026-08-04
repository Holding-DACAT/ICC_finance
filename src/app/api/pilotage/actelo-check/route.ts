import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { statusGroup } from "@/lib/pilotage";

export const dynamic = "force-dynamic";

/**
 * Outil de **diagnostic Actelo** (admin/RH uniquement).
 *
 * Inspecte le référentiel agences et un échantillon de dossiers pour caler le
 * pilotage sur les données réelles :
 *   - liste des agences (type / mandataryUserId) → filtre « Agence » ;
 *   - échantillon de dossiers : champs de pilotage (montant, commissions,
 *     statut, dates) + totaux, pour vérifier le calcul des chiffres.
 *
 * RGPD : on n'extrait **aucune donnée personnelle d'emprunteur/client** — seuls
 * les champs de pilotage (montants, commissions, statuts, dates, id agence/
 * manager) sont renvoyés. Le token n'est jamais exposé.
 */

interface RawAgencyLite {
  _id?: string;
  name?: string;
  type?: string;
  isActive?: boolean;
  mandataryUserId?: string | null;
  parentAgencyId?: string | null;
}

interface RawCaseLite {
  _id?: string;
  ref?: string;
  status?: string;
  meta_parent?: { agencyId?: string; companyId?: string };
  managerId?: string;
  managerFullName_d?: string;
  agencyName_d?: string;
  amountBorrowed_d?: number;
  bankCommission_d?: number;
  brokerCommission_d?: number;
  mandataryCommission_d?: number;
  prescriberCommission_d?: number;
  otherCommission_d?: number;
  meta_created?: { at?: string; fullName_d?: string };
  stageDates?: Record<string, string | null>;
  [k: string]: unknown;
}

interface ListLite<T> {
  results?: T[];
  body?: T[];
  count?: number;
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number | null; json?: T; error?: string }> {
  try {
    const res = await fetch(url, { headers: { ...headers, Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 300) };
    return { ok: true, status: res.status, json: (await res.json()) as T };
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "RH")) {
    return NextResponse.json({ error: "Accès refusé (réservé ADMIN/RH)." }, { status: 403 });
  }

  const token = process.env.ACTELO_API_TOKEN;
  const base = (process.env.ACTELO_API_BASE_URL ?? "https://api.actelo.fr").replace(/\/$/, "");
  if (!token) return NextResponse.json({ error: "ACTELO_API_TOKEN absent." }, { status: 400 });

  const authHeaders = { Authorization: token };

  // --- Agences : type / mandataryUserId → alimente le filtre « Agence ». -----
  const agenciesRes = await fetchJson<ListLite<RawAgencyLite>>(`${base}/api/v1/agencies?limit=100`, authHeaders);
  const agenciesRaw = agenciesRes.json?.results ?? agenciesRes.json?.body ?? [];
  const agencies = {
    error: agenciesRes.ok ? undefined : agenciesRes.error,
    count: agenciesRaw.length,
    structural: agenciesRaw.filter((a) => a.isActive !== false && a.type !== "MANDATAIRE" && !a.mandataryUserId).length,
    list: agenciesRaw.map((a) => ({
      name: a.name,
      type: a.type,
      mandataryUserId: a.mandataryUserId ?? null,
      isActive: a.isActive,
    })),
  };

  // --- Dossiers : échantillon + totaux (champs de pilotage uniquement). ------
  const casesRes = await fetchJson<ListLite<RawCaseLite>>(`${base}/api/v1/cases?limit=50`, authHeaders);
  const casesRaw = casesRes.json?.results ?? casesRes.json?.body ?? [];

  const createdDates = casesRaw
    .map((c) => c.meta_created?.at)
    .filter((d): d is string => Boolean(d))
    .sort();
  const statusGroups: Record<string, number> = {};
  for (const c of casesRaw) {
    const g = statusGroup(c.status ?? "");
    statusGroups[g] = (statusGroups[g] ?? 0) + 1;
  }

  const cases = {
    error: casesRes.ok ? undefined : casesRes.error,
    fetched: casesRaw.length,
    totalCount: casesRes.json?.count,
    createdRange: createdDates.length ? { min: createdDates[0], max: createdDates.at(-1) } : null,
    fieldsPopulated: {
      amountBorrowed_d: casesRaw.filter((c) => typeof c.amountBorrowed_d === "number" && c.amountBorrowed_d > 0).length,
      brokerCommission_d: casesRaw.filter((c) => typeof c.brokerCommission_d === "number" && c.brokerCommission_d > 0).length,
      meta_created_at: casesRaw.filter((c) => c.meta_created?.at).length,
      signDate: casesRaw.filter((c) => c.stageDates?.signDate).length,
    },
    sums: {
      amountBorrowed_d: casesRaw.reduce((s, c) => s + (c.amountBorrowed_d ?? 0), 0),
      brokerCommission_d: casesRaw.reduce((s, c) => s + (c.brokerCommission_d ?? 0), 0),
    },
    statusGroups,
    sample: casesRaw.slice(0, 3).map((c) => ({
      _id: c._id,
      ref: c.ref,
      status: c.status,
      agencyId: c.meta_parent?.agencyId ?? null,
      agencyName_d: c.agencyName_d ?? null,
      managerId: c.managerId ?? null,
      managerFullName_d: c.managerFullName_d ?? null,
      amountBorrowed_d: c.amountBorrowed_d ?? null,
      brokerCommission_d: c.brokerCommission_d ?? null,
      bankCommission_d: c.bankCommission_d ?? null,
      mandataryCommission_d: c.mandataryCommission_d ?? null,
      meta_created_at: c.meta_created?.at ?? null,
      stageDates: c.stageDates ?? null,
      topLevelKeys: Object.keys(c),
    })),
  };

  return NextResponse.json({ authScheme: { header: "Authorization", prefix: "" }, agencies, cases });
}
