"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { auth } from "@/auth";
import { formatRemunerationRule, toCents } from "@/lib/apporteur";
import { writeAudit } from "@/lib/audit";
import { getActeloProvider } from "@/lib/integrations/actelo";
import {
  ingestApporteursWorkbook,
  type ApporteursImportReport,
} from "@/lib/import/apporteurs-ingest";
import { parseApporteursWorkbook } from "@/lib/import/apporteurs-import";
import { prisma } from "@/lib/prisma";
import { canWriteApporteurs } from "@/lib/rbac";
import {
  apporteurFormSchema,
  conventionFormSchema,
  versementFormSchema,
  type ApporteurFormValues,
  type ConventionFormValues,
  type VersementFormValues,
} from "@/lib/validations/apporteur";

/**
 * Server Actions du module « Apporteurs » (back-office).
 * Chaque action vérifie le rôle **côté serveur** et journalise l'écriture
 * (cf. CLAUDE.md §4).
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const PATH = "/apporteurs";
const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 Mo
const ACCEPTED_EXT = [".xlsx", ".xls"];

/** Session + habilitation d'écriture, ou message d'erreur normalisé. */
async function requireWriter(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  if (!canWriteApporteurs(session.user.role)) {
    return { ok: false, error: "Accès refusé : module réservé au back-office." };
  }
  return { ok: true, userId: session.user.id };
}

/** Montant saisi en euros (« 1 234,56 ») → centimes, ou null. */
function euros(value: string | undefined): number | null {
  return value ? toCents(value) : null;
}

function optionalDate(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

// --------------------------------------------------------------------------
// Apporteurs
// --------------------------------------------------------------------------

function apporteurData(values: ApporteurFormValues) {
  return {
    name: values.name.trim(),
    siren: values.siren || null,
    enseigne: values.enseigne || null,
    holderName: values.holderName || null,
    email: values.email ? values.email.toLowerCase() : null,
    phone: values.phone || null,
    address: values.address || null,
    postalCode: values.postalCode || null,
    city: values.city || null,
    kbisDate: optionalDate(values.kbisDate),
    ribReceived: values.ribReceived,
    status: values.status,
    companyId: values.companyId || null,
    notes: values.notes || null,
  };
}

export async function createApporteur(values: ApporteurFormValues): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = apporteurFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const created = await prisma.apporteur.create({ data: apporteurData(parsed.data) });
    await writeAudit({
      userId: guard.userId,
      action: "CREATE",
      entity: "Apporteur",
      entityId: created.id,
      diff: { name: created.name, siren: created.siren },
    });
    revalidatePath(PATH);
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, error: uniqueError(error, "Un apporteur porte déjà ce nom ou ce SIREN.") };
  }
}

export async function updateApporteur(
  id: string,
  values: ApporteurFormValues,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = apporteurFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const updated = await prisma.apporteur.update({
      where: { id },
      data: apporteurData(parsed.data),
    });
    await writeAudit({
      userId: guard.userId,
      action: "UPDATE",
      entity: "Apporteur",
      entityId: id,
      diff: { name: updated.name, siren: updated.siren, status: updated.status },
    });
    revalidatePath(PATH);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: uniqueError(error, "Un apporteur porte déjà ce nom ou ce SIREN.") };
  }
}

// --------------------------------------------------------------------------
// Conventions
// --------------------------------------------------------------------------

function conventionData(values: ConventionFormValues) {
  const rate = values.remunerationRate
    ? Number.parseFloat(values.remunerationRate.replace(",", ".")) / 100
    : null;
  const rule = {
    type: values.remunerationType,
    rate: values.remunerationType === "POURCENTAGE" ? rate : null,
    fixedCents: values.remunerationType === "FORFAIT" ? euros(values.remunerationFixed) : null,
    capCents: euros(values.remunerationCap),
    base: values.remunerationBase,
  };
  return {
    apporteurId: values.apporteurId,
    number: values.number || null,
    requestedBy: values.requestedBy || null,
    signatureStatus: values.signatureStatus,
    conventionDate: optionalDate(values.conventionDate),
    kbisDate: optionalDate(values.kbisDate),
    holderName: values.holderName || null,
    address: values.address || null,
    postalCode: values.postalCode || null,
    city: values.city || null,
    endDate: optionalDate(values.endDate),
    companyId: values.companyId || null,
    notes: values.notes || null,
    remunerationType: rule.type,
    remunerationRate: rule.rate,
    remunerationFixedCents: rule.fixedCents,
    remunerationCapCents: rule.capCents,
    remunerationBase: rule.base,
    remunerationLabel: formatRemunerationRule(rule),
  };
}

export async function createConvention(values: ConventionFormValues): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = conventionFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const created = await prisma.apporteurConvention.create({ data: conventionData(parsed.data) });
  await writeAudit({
    userId: guard.userId,
    action: "CREATE",
    entity: "ApporteurConvention",
    entityId: created.id,
    diff: { apporteurId: created.apporteurId, statut: created.signatureStatus },
  });
  revalidatePath(PATH);
  return { ok: true, id: created.id };
}

export async function updateConvention(
  id: string,
  values: ConventionFormValues,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = conventionFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const updated = await prisma.apporteurConvention.update({
    where: { id },
    data: conventionData(parsed.data),
  });
  await writeAudit({
    userId: guard.userId,
    action: "UPDATE",
    entity: "ApporteurConvention",
    entityId: id,
    diff: { statut: updated.signatureStatus, remuneration: updated.remunerationLabel },
  });
  revalidatePath(PATH);
  return { ok: true, id };
}

export async function deleteConvention(id: string): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.apporteurConvention.delete({ where: { id } });
  await writeAudit({
    userId: guard.userId,
    action: "DELETE",
    entity: "ApporteurConvention",
    entityId: id,
  });
  revalidatePath(PATH);
  return { ok: true };
}

// --------------------------------------------------------------------------
// Versements
// --------------------------------------------------------------------------

function versementData(values: VersementFormValues) {
  return {
    apporteurId: values.apporteurId,
    conventionId: values.conventionId || null,
    companyId: values.companyId || null,
    agencyId: values.agencyId || null,
    memberId: values.memberId || null,
    commercialName: values.commercialName,
    type: values.type,
    year: Number.parseInt(values.year, 10),
    month: values.month ? Number.parseInt(values.month, 10) : null,
    dossierLabel: values.dossierLabel,
    acteloCaseId: values.acteloCaseId || null,
    amountCents: euros(values.amount) ?? 0,
    commissionCents: euros(values.commission),
    feesCents: euros(values.fees),
    paymentMode: values.paymentMode,
    paymentRef: values.paymentRef || null,
    invoiceReceived: values.invoiceReceived,
    paymentDate: optionalDate(values.paymentDate),
    sirenKbis: values.sirenKbis || null,
    sirenInvoice: values.sirenInvoice || null,
    sirenVerified: values.sirenVerified,
    status: values.status,
    notes: values.notes || null,
  };
}

export async function createVersement(values: VersementFormValues): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = versementFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const created = await prisma.apporteurVersement.create({ data: versementData(parsed.data) });
  await writeAudit({
    userId: guard.userId,
    action: "CREATE",
    entity: "ApporteurVersement",
    entityId: created.id,
    diff: {
      apporteurId: created.apporteurId,
      dossier: created.dossierLabel,
      montantCentimes: created.amountCents,
    },
  });
  revalidatePath(PATH);
  return { ok: true, id: created.id };
}

export async function updateVersement(
  id: string,
  values: VersementFormValues,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = versementFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const updated = await prisma.apporteurVersement.update({
    where: { id },
    data: versementData(parsed.data),
  });
  await writeAudit({
    userId: guard.userId,
    action: "UPDATE",
    entity: "ApporteurVersement",
    entityId: id,
    diff: { statut: updated.status, montantCentimes: updated.amountCents },
  });
  revalidatePath(PATH);
  return { ok: true, id };
}

/** Pointage rapide : marque un versement comme payé à la date du jour. */
export async function markVersementPaid(id: string): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  const updated = await prisma.apporteurVersement.update({
    where: { id },
    data: { status: "VERSE", paymentDate: new Date() },
  });
  await writeAudit({
    userId: guard.userId,
    action: "UPDATE",
    entity: "ApporteurVersement",
    entityId: id,
    diff: { statut: updated.status, dateVersement: updated.paymentDate?.toISOString() },
  });
  revalidatePath(PATH);
  return { ok: true, id };
}

export async function deleteVersement(id: string): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.apporteurVersement.delete({ where: { id } });
  await writeAudit({
    userId: guard.userId,
    action: "DELETE",
    entity: "ApporteurVersement",
    entityId: id,
  });
  revalidatePath(PATH);
  return { ok: true };
}

// --------------------------------------------------------------------------
// Import du classeur historique
// --------------------------------------------------------------------------

function importFailure(error: string, fileName = ""): ApporteursImportReport {
  return {
    ok: false,
    error,
    committed: false,
    replaced: false,
    fileName,
    sheets: [],
    ignoredSheets: [],
    conventionRows: 0,
    versementRows: 0,
    apporteursCreated: 0,
    apporteursUpdated: 0,
    conventionsCreated: 0,
    versementsCreated: 0,
    versementsSkipped: 0,
    errors: 0,
    warnings: 0,
    issues: [],
  };
}

/**
 * Analyse (dry-run) puis reprise du classeur « Suivi facturation apporteurs ».
 *
 * @param formData `file` (.xlsx/.xls) + `commit` ("1" pour écrire en base)
 *   + `replace` ("1" pour purger d'abord le module).
 */
export async function runApporteursImport(formData: FormData): Promise<ApporteursImportReport> {
  const guard = await requireWriter();
  if (!guard.ok) return importFailure(guard.error);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return importFailure("Aucun fichier reçu.");
  }
  if (file.size > MAX_FILE_BYTES) {
    return importFailure("Fichier trop volumineux (12 Mo maximum).", file.name);
  }
  if (!ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return importFailure("Format non pris en charge : fournissez un classeur .xlsx.", file.name);
  }

  const commit = formData.get("commit") === "1";
  const replace = formData.get("replace") === "1";

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    parsed = parseApporteursWorkbook(
      wb.SheetNames.map((name) => ({
        name,
        aoa: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, {
          header: 1,
          raw: true,
          defval: null,
          blankrows: false,
        }),
      })),
    );
  } catch {
    return importFailure("Lecture du classeur impossible (fichier corrompu ?).", file.name);
  }

  const report = await ingestApporteursWorkbook(parsed, { fileName: file.name, commit, replace });

  if (report.committed) {
    await writeAudit({
      userId: guard.userId,
      action: "CREATE",
      entity: "Apporteur",
      diff: {
        import: file.name,
        remplacement: report.replaced,
        apporteurs: report.apporteursCreated,
        conventions: report.conventionsCreated,
        versements: report.versementsCreated,
      },
    });
    revalidatePath(PATH);
  }

  return report;
}

/** Message d'erreur lisible pour une violation de contrainte d'unicité. */
function uniqueError(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  if (code === "P2002") return fallback;
  console.error("Action apporteurs en échec :", error);
  return "Enregistrement impossible.";
}

// --------------------------------------------------------------------------
// Rapprochement Actelo (module Pilotage)
// --------------------------------------------------------------------------

export interface ActeloCaseOption {
  id: string;
  ref: string | null;
  agencyName: string | null;
  managerName: string | null;
  signDate: string | null;
  /** Commission courtier remontée par Actelo (en euros). */
  brokerCommission: number;
}

/**
 * Recherche un dossier Actelo sur un exercice pour rattacher un versement.
 * La saisie libre reste possible : cette recherche est une aide, pas un
 * passage obligé (cf. arbitrage du lot).
 */
export async function searchActeloCases(params: {
  year: number;
  query: string;
}): Promise<ActeloCaseOption[]> {
  const guard = await requireWriter();
  if (!guard.ok) return [];

  const needle = params.query.trim().toLowerCase();
  if (needle.length < 2) return [];

  try {
    const provider = getActeloProvider();
    const cases = await provider.listCases({
      from: new Date(params.year, 0, 1),
      to: new Date(params.year, 11, 31, 23, 59, 59),
    });
    return cases
      .filter((c) =>
        [c.ref, c.managerName, c.agencyName]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      )
      .slice(0, 20)
      .map((c) => ({
        id: c.id,
        ref: c.ref,
        agencyName: c.agencyName,
        managerName: c.managerName,
        signDate: c.signDate,
        brokerCommission: c.brokerCommission,
      }));
  } catch (error) {
    console.error("Recherche Actelo indisponible :", error);
    return [];
  }
}
