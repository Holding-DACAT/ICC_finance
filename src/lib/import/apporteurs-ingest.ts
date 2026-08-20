import type { Prisma } from "@prisma/client";

import { formatRemunerationRule } from "@/lib/apporteur";
import { prisma } from "@/lib/prisma";
import type {
  NormalizedConvention,
  NormalizedVersement,
  RowResult,
  WorkbookParseResult,
} from "@/lib/import/apporteurs-import";

/**
 * Intégration en base du classeur « Suivi facturation apporteurs ».
 *
 * Reprise **idempotente** : les apporteurs sont rapprochés par SIREN puis par
 * nom, les conventions par (apporteur, n°, date) et les versements par
 * (apporteur, exercice, dossier, montant, feuille d'origine). Relancer
 * l'import ne crée donc pas de doublons.
 */

export interface ImportIssue {
  label: string;
  level: "error" | "warning";
  message: string;
}

export interface ApporteursImportReport {
  ok: boolean;
  error?: string;
  committed: boolean;
  replaced: boolean;
  fileName: string;
  sheets: WorkbookParseResult["sheets"];
  ignoredSheets: string[];
  conventionRows: number;
  versementRows: number;
  apporteursCreated: number;
  apporteursUpdated: number;
  conventionsCreated: number;
  versementsCreated: number;
  versementsSkipped: number;
  errors: number;
  warnings: number;
  /** Échantillon d'anomalies (200 max) pour le rapport à l'écran. */
  issues: ImportIssue[];
}

/** Clé de rapprochement insensible à la casse et aux accents. */
function key(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CHUNK = 200;

async function createInChunks<T>(
  rows: T[],
  create: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await create(rows.slice(i, i + CHUNK));
  }
}

/** Première convention applicable à un versement (date de convention ≤ versement). */
function pickConventionId(
  conventions: { id: string; date: Date | null; status: string }[],
  paymentDate: Date | null,
): string | null {
  if (conventions.length === 0) return null;
  const usable = conventions.filter((c) => c.status !== "RESILIEE");
  const pool = usable.length > 0 ? usable : conventions;
  if (paymentDate) {
    const before = pool
      .filter((c) => c.date && c.date <= paymentDate)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    if (before[0]) return before[0].id;
  }
  return pool[0]?.id ?? null;
}

function collectIssues(
  rows: RowResult<unknown>[],
  issues: ImportIssue[],
  counters: { errors: number; warnings: number },
): void {
  for (const row of rows) {
    for (const message of row.errors) {
      counters.errors++;
      if (issues.length < 200) issues.push({ label: row.label, level: "error", message });
    }
    for (const message of row.warnings) {
      counters.warnings++;
      if (issues.length < 200) issues.push({ label: row.label, level: "warning", message });
    }
  }
}

export interface IngestOptions {
  fileName: string;
  /** false = analyse seule (dry-run), aucune écriture. */
  commit: boolean;
  /** true = purge préalable des apporteurs/conventions/versements. */
  replace: boolean;
}

export async function ingestApporteursWorkbook(
  parsed: WorkbookParseResult,
  options: IngestOptions,
): Promise<ApporteursImportReport> {
  const counters = { errors: 0, warnings: 0 };
  const issues: ImportIssue[] = [];
  collectIssues(parsed.conventions, issues, counters);
  collectIssues(parsed.versements, issues, counters);

  const conventionRows = parsed.conventions
    .map((r) => r.value)
    .filter((v): v is NormalizedConvention => Boolean(v));
  const versementRows = parsed.versements
    .map((r) => r.value)
    .filter((v): v is NormalizedVersement => Boolean(v));

  const report: ApporteursImportReport = {
    ok: true,
    committed: false,
    replaced: false,
    fileName: options.fileName,
    sheets: parsed.sheets,
    ignoredSheets: parsed.ignoredSheets,
    conventionRows: conventionRows.length,
    versementRows: versementRows.length,
    apporteursCreated: 0,
    apporteursUpdated: 0,
    conventionsCreated: 0,
    versementsCreated: 0,
    versementsSkipped: 0,
    errors: counters.errors,
    warnings: counters.warnings,
    issues,
  };

  if (conventionRows.length === 0 && versementRows.length === 0) {
    return { ...report, ok: false, error: "Aucune feuille exploitable dans ce classeur." };
  }

  // --- Consolidation des apporteurs (SIREN prioritaire, sinon nom) ----------
  interface PendingApporteur {
    name: string;
    siren: string | null;
    enseigne: string | null;
    holderName: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    kbisDate: Date | null;
  }
  const pending = new Map<string, PendingApporteur>();
  const aliasToKey = new Map<string, string>();

  const remember = (candidate: PendingApporteur) => {
    const nameKey = key(candidate.name);
    if (!nameKey) return;
    const id = candidate.siren ? `siren:${candidate.siren}` : `name:${nameKey}`;
    // Un nom déjà vu sous un SIREN rejoint la même fiche.
    const existingKey = aliasToKey.get(nameKey) ?? id;
    const current = pending.get(existingKey);
    if (current) {
      pending.set(existingKey, {
        name: current.name,
        siren: current.siren ?? candidate.siren,
        enseigne: current.enseigne ?? candidate.enseigne,
        holderName: current.holderName ?? candidate.holderName,
        address: current.address ?? candidate.address,
        postalCode: current.postalCode ?? candidate.postalCode,
        city: current.city ?? candidate.city,
        kbisDate: current.kbisDate ?? candidate.kbisDate,
      });
    } else {
      pending.set(existingKey, candidate);
    }
    aliasToKey.set(nameKey, existingKey);
  };

  for (const c of conventionRows) {
    remember({
      name: c.apporteurName,
      siren: c.siren,
      enseigne: c.enseigne,
      holderName: c.holderName,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      kbisDate: c.kbisDate,
    });
  }
  for (const v of versementRows) {
    remember({
      name: v.apporteurName,
      siren: v.sirenKbis ?? v.sirenInvoice,
      enseigne: v.enseigne,
      holderName: null,
      address: null,
      postalCode: null,
      city: null,
      kbisDate: null,
    });
  }

  if (!options.commit) return report;

  // --- Écriture ------------------------------------------------------------
  if (options.replace) {
    await prisma.apporteurVersement.deleteMany({});
    await prisma.apporteurConvention.deleteMany({});
    await prisma.apporteur.deleteMany({});
    report.replaced = true;
  }

  const [companies, agencies, members] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true } }),
    prisma.agency.findMany({ select: { id: true, name: true } }),
    prisma.member.findMany({ select: { id: true, firstName: true, lastName: true } }),
  ]);
  const companyByName = new Map(companies.map((c) => [key(c.name), c.id]));
  const agencyByName = new Map(agencies.map((a) => [key(a.name), a.id]));
  const memberByName = new Map<string, string>();
  for (const m of members) {
    memberByName.set(key(`${m.firstName} ${m.lastName}`), m.id);
    memberByName.set(key(`${m.lastName} ${m.firstName}`), m.id);
  }

  // Apporteurs existants (par SIREN puis par nom).
  const existing = await prisma.apporteur.findMany({
    select: { id: true, name: true, siren: true, kbisDate: true },
  });
  const idBySiren = new Map(existing.filter((a) => a.siren).map((a) => [a.siren as string, a.id]));
  const idByName = new Map(existing.map((a) => [key(a.name), a.id]));

  /** Nom unique en base : suffixé si un homonyme existe déjà avec un autre SIREN. */
  const usedNames = new Set(existing.map((a) => key(a.name)));

  for (const [, candidate] of pending) {
    const foundId =
      (candidate.siren ? idBySiren.get(candidate.siren) : undefined) ??
      idByName.get(key(candidate.name));

    const data = {
      siren: candidate.siren,
      enseigne: candidate.enseigne,
      holderName: candidate.holderName,
      address: candidate.address,
      postalCode: candidate.postalCode,
      city: candidate.city,
      kbisDate: candidate.kbisDate,
    };

    if (foundId) {
      // On complète uniquement les champs vides (l'import n'écrase pas la saisie).
      const current = existing.find((a) => a.id === foundId);
      await prisma.apporteur.update({
        where: { id: foundId },
        data: {
          siren: current?.siren ?? data.siren,
          enseigne: data.enseigne ?? undefined,
          holderName: data.holderName ?? undefined,
          address: data.address ?? undefined,
          postalCode: data.postalCode ?? undefined,
          city: data.city ?? undefined,
          kbisDate: current?.kbisDate ?? data.kbisDate ?? undefined,
        },
      });
      report.apporteursUpdated++;
      idByName.set(key(candidate.name), foundId);
      if (data.siren) idBySiren.set(data.siren, foundId);
      continue;
    }

    let name = candidate.name;
    if (usedNames.has(key(name))) name = `${name} (${candidate.siren ?? "2"})`;
    const created = await prisma.apporteur.create({
      data: { name, ...data },
      select: { id: true },
    });
    usedNames.add(key(name));
    idByName.set(key(candidate.name), created.id);
    if (candidate.siren) idBySiren.set(candidate.siren, created.id);
    report.apporteursCreated++;
  }

  const resolveApporteurId = (name: string, siren: string | null): string | undefined =>
    (siren ? idBySiren.get(siren) : undefined) ?? idByName.get(key(name));

  // --- Conventions ---------------------------------------------------------
  const existingConventions = await prisma.apporteurConvention.findMany({
    select: { id: true, apporteurId: true, number: true, conventionDate: true },
  });
  const conventionKeys = new Set(
    existingConventions.map(
      (c) => `${c.apporteurId}|${c.number ?? ""}|${c.conventionDate?.toISOString() ?? ""}`,
    ),
  );

  const conventionData: Prisma.ApporteurConventionCreateManyInput[] = [];
  for (const c of conventionRows) {
    const apporteurId = resolveApporteurId(c.apporteurName, c.siren);
    if (!apporteurId) continue;
    const dedupe = `${apporteurId}|${c.number ?? ""}|${c.conventionDate?.toISOString() ?? ""}`;
    if (conventionKeys.has(dedupe)) continue;
    conventionKeys.add(dedupe);

    const rule = c.remuneration;
    conventionData.push({
      apporteurId,
      number: c.number,
      requestedBy: c.requestedBy,
      signatureStatus: c.signatureStatus,
      conventionDate: c.conventionDate,
      kbisDate: c.kbisDate,
      holderName: c.holderName,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      companyId: c.holderCompanyLabel ? companyByName.get(key(c.holderCompanyLabel)) ?? null : null,
      remunerationType: rule?.type ?? "NON_RENSEIGNEE",
      remunerationRate: rule?.rate ?? null,
      remunerationFixedCents: rule?.fixedCents ?? null,
      remunerationCapCents: rule?.capCents ?? null,
      remunerationBase: rule?.base ?? "COMMISSION",
      remunerationLabel: c.remunerationLabel ?? (rule ? formatRemunerationRule(rule) : null),
    });
  }
  await createInChunks(conventionData, (chunk) =>
    prisma.apporteurConvention.createMany({ data: chunk }),
  );
  report.conventionsCreated = conventionData.length;

  // --- Versements ----------------------------------------------------------
  const conventionsByApporteur = new Map<
    string,
    { id: string; date: Date | null; status: string }[]
  >();
  for (const c of await prisma.apporteurConvention.findMany({
    select: { id: true, apporteurId: true, conventionDate: true, signatureStatus: true },
  })) {
    const list = conventionsByApporteur.get(c.apporteurId) ?? [];
    list.push({ id: c.id, date: c.conventionDate, status: c.signatureStatus });
    conventionsByApporteur.set(c.apporteurId, list);
  }

  const existingVersements = await prisma.apporteurVersement.findMany({
    select: { apporteurId: true, sourceSheet: true, sourceRow: true },
  });
  // Clé de reprise : feuille + ligne d'origine (deux lignes identiques du
  // classeur restent donc deux versements distincts).
  const versementKeys = new Set(
    existingVersements
      .filter((v) => v.sourceSheet && v.sourceRow !== null)
      .map((v) => `${v.apporteurId}|${v.sourceSheet}|${v.sourceRow}`),
  );

  const versementData: Prisma.ApporteurVersementCreateManyInput[] = [];
  for (const v of versementRows) {
    const apporteurId = resolveApporteurId(v.apporteurName, v.sirenKbis ?? v.sirenInvoice);
    if (!apporteurId) continue;
    const dedupe = `${apporteurId}|${v.sourceSheet}|${v.sourceRow}`;
    if (versementKeys.has(dedupe)) {
      report.versementsSkipped++;
      continue;
    }
    versementKeys.add(dedupe);

    versementData.push({
      apporteurId,
      conventionId: pickConventionId(conventionsByApporteur.get(apporteurId) ?? [], v.paymentDate),
      companyId: v.companyLabel ? companyByName.get(key(v.companyLabel)) ?? null : null,
      companyLabel: v.companyLabel,
      agencyId: v.agencyLabel ? agencyByName.get(key(v.agencyLabel)) ?? null : null,
      commercialName: v.commercialName,
      memberId: memberByName.get(key(v.commercialName)) ?? null,
      type: v.type,
      year: v.year,
      month: v.month,
      dossierLabel: v.dossierLabel,
      amountCents: v.amountCents,
      commissionCents: v.commissionCents,
      feesCents: v.feesCents,
      paymentMode: v.paymentMode,
      paymentRef: v.paymentRef,
      invoiceReceived: v.invoiceReceived,
      paymentDate: v.paymentDate,
      sirenKbis: v.sirenKbis,
      sirenInvoice: v.sirenInvoice,
      sirenVerified: v.sirenVerified,
      status: v.status,
      sourceSheet: v.sourceSheet,
      sourceRow: v.sourceRow,
    });
  }
  await createInChunks(versementData, (chunk) =>
    prisma.apporteurVersement.createMany({ data: chunk }),
  );
  report.versementsCreated = versementData.length;
  report.committed = true;

  return report;
}
