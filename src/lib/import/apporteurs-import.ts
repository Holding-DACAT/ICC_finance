/**
 * Import du classeur « Suivi facturation apporteurs » — mapping & validation.
 *
 * Module volontairement **pur** (ni Prisma ni xlsx) pour rester testable : il
 * transforme des feuilles brutes (array-of-arrays) en lignes normalisées.
 *
 * Deux familles de feuilles sont reconnues, quelles que soient les variantes
 * de colonnes rencontrées de 2020 à aujourd'hui :
 *
 *  - **conventions** (« LISTE DES CONVENTIONS ») : Apporteurs, N° convention,
 *    Demandé par, Date convention, Signature, N° SIREN, Date kbis,
 *    Titulaire(s), Adresse, Code Postal, Ville, Rémunérations ;
 *  - **versements** (« Suivi apporteurs 20XX ») : Agence, Commercial, Mois,
 *    Apporteurs, SIREN, Dossiers, Montant, mode de paiement, Facture,
 *    date d'encaissement/versement, Commission perçue, Honoraires perçus…
 *
 * Les colonnes de coordonnées bancaires éventuelles sont **ignorées** : aucun
 * RIB/IBAN n'est repris (cf. CLAUDE.md §4).
 */

import {
  parseMonth,
  parsePaymentMode,
  parseRemunerationLabel,
  parseSignature,
  normalizeSiren,
  resolveVersementStatus,
  toCents,
  type RemunerationRule,
} from "@/lib/apporteur";
import type { ConventionStatus, VersementStatus, VersementType } from "@prisma/client";

type Cell = unknown;

// --------------------------------------------------------------------------
// Utilitaires de cellules
// --------------------------------------------------------------------------

/** Normalise un libellé d'en-tête : sans accents, minuscules, ponctuation → espace. */
function norm(value: Cell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function str(value: Cell): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convertit une cellule (Date, n° de série Excel ou texte) en Date ou null. */
export function toDate(value: Cell): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // N° de série Excel : jours depuis le 30/12/1899.
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const d = new Date(Date.UTC(year, mm - 1, dd, 12));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** true si la cellule porte une mention d'annulation (« annulé », « annulée »). */
function isCancelled(...values: Cell[]): boolean {
  return values.some((v) => /annul/i.test(String(v ?? "")));
}

// --------------------------------------------------------------------------
// Détection des colonnes
// --------------------------------------------------------------------------

type ConventionKey =
  | "apporteur"
  | "numero"
  | "demandePar"
  | "dateConvention"
  | "signature"
  | "siren"
  | "dateKbis"
  | "titulaire"
  | "adresse"
  | "codePostal"
  | "ville"
  | "remuneration";

const CONVENTION_ALIASES: Record<ConventionKey, string[]> = {
  apporteur: ["apporteurs", "apporteur"],
  numero: ["n convention", "no convention", "numero convention", "convention"],
  demandePar: ["demande par", "demandee par"],
  dateConvention: ["date convention", "date de convention"],
  signature: ["signature", "signatures"],
  siren: ["n siren", "no siren", "siren"],
  dateKbis: ["date kbis", "kbis"],
  titulaire: ["titulaire s", "titulaire", "titulaires"],
  adresse: ["adresse"],
  codePostal: ["code postal", "cp"],
  ville: ["ville"],
  remuneration: ["remunerations", "remuneration"],
};

type VersementKey =
  | "agence"
  | "commercial"
  | "type"
  | "mois"
  | "annee"
  | "apporteur"
  | "agentCommercial"
  | "sirenKbis"
  | "sirenFacture"
  | "verifSignature"
  | "dossier"
  | "montant"
  | "paiement"
  | "facture"
  | "datePaiement"
  | "verifSiren"
  | "commission"
  | "honoraires";

const VERSEMENT_ALIASES: Record<VersementKey, string[]> = {
  agence: ["agence", "agences"],
  commercial: ["commercial", "commerciale"],
  type: ["ristourne chq cdx", "ristourne", "type"],
  mois: ["mois"],
  annee: ["annee"],
  apporteur: ["apporteurs personnes parainnees", "apporteurs", "apporteur"],
  agentCommercial: ["agent commercial"],
  sirenKbis: ["n siren kbis", "n siren", "no siren", "siren", "n siret"],
  sirenFacture: ["n siren facture", "siren facture"],
  verifSignature: ["verif signature convention", "verif signature", "signature"],
  dossier: ["dossiers", "dossier", "nom du dossier"],
  montant: ["montant", "ristourne"],
  paiement: ["mode paiement", "n cheque", "no cheque", "cheque", "mode de paiement"],
  facture: ["facture"],
  datePaiement: ["date versement", "date encaissement", "date de versement"],
  verifSiren: ["verif siren"],
  commission: ["commission percue", "commission percu", "commission"],
  honoraires: ["honoraires percu", "honoraires percus", "honoraires"],
};

export interface ColumnLayout<K extends string> {
  /** Index 0-basé de la ligne d'en-tête dans la feuille. */
  headerRowIndex: number;
  columns: Partial<Record<K, number>>;
}

function detect<K extends string>(
  aoa: Cell[][],
  aliases: Record<K, string[]>,
  isValid: (columns: Partial<Record<K, number>>) => boolean,
  limit = 15,
): ColumnLayout<K> | null {
  const keys = Object.keys(aliases) as K[];
  for (let r = 0; r < Math.min(aoa.length, limit); r++) {
    const row = aoa[r] ?? [];
    const columns: Partial<Record<K, number>> = {};
    for (let c = 0; c < row.length; c++) {
      const header = norm(row[c]);
      if (!header) continue;
      for (const key of keys) {
        if (columns[key] === undefined && aliases[key].includes(header)) columns[key] = c;
      }
    }
    if (isValid(columns)) return { headerRowIndex: r, columns };
  }
  return null;
}

/** Détecte la ligne d'en-tête d'une feuille « conventions ». */
export function detectConventionLayout(aoa: Cell[][]): ColumnLayout<ConventionKey> | null {
  return detect(
    aoa,
    CONVENTION_ALIASES,
    (c) => c.apporteur !== undefined && c.signature !== undefined && c.remuneration !== undefined,
  );
}

/** Détecte la ligne d'en-tête d'une feuille « versements ». */
export function detectVersementLayout(aoa: Cell[][]): ColumnLayout<VersementKey> | null {
  return detect(
    aoa,
    VERSEMENT_ALIASES,
    (c) => c.apporteur !== undefined && c.dossier !== undefined && c.montant !== undefined,
  );
}

function cellAt<K extends string>(row: Cell[], layout: ColumnLayout<K>, key: K): Cell {
  const idx = layout.columns[key];
  return idx === undefined ? undefined : row[idx];
}

// --------------------------------------------------------------------------
// Libellé d'apporteur
// --------------------------------------------------------------------------

export interface ApporteurLabel {
  /** Nom retenu comme identité (majuscules, sans annotation). */
  name: string;
  /** Enseigne/réseau extrait des parenthèses (ORPI, IMMOSKY…). */
  enseigne: string | null;
  /** true si le libellé porte une mention d'annulation. */
  cancelled: boolean;
}

/**
 * Nettoie un libellé d'apporteur : « HOMEKARE (IMMOSKY) », « JFC FINANCES
 * (210€) - annulé », « DAMIEN OLMOS (ticket immobilier) ».
 */
export function parseApporteurLabel(raw: Cell): ApporteurLabel {
  const text = str(raw);
  const cancelled = /annul/i.test(text);
  let work = text.replace(/[-–]\s*annul\w*.*$/i, "").trim();

  let enseigne: string | null = null;
  const paren = work.match(/[([]([^)\]]+)[)\]]/);
  if (paren) {
    const inner = paren[1].trim();
    // On écarte les parenthèses qui portent un montant ou une note d'annulation.
    if (!/\d+\s*[€]/.test(inner) && !/annul/i.test(inner)) enseigne = inner;
    work = work.replace(paren[0], " ").trim();
  }

  const name = work.replace(/\s+/g, " ").replace(/[-–,;]+$/, "").trim().toUpperCase();
  return { name, enseigne, cancelled };
}

// --------------------------------------------------------------------------
// Lignes normalisées
// --------------------------------------------------------------------------

export interface NormalizedConvention {
  apporteurName: string;
  enseigne: string | null;
  siren: string | null;
  number: string | null;
  requestedBy: string | null;
  signatureStatus: ConventionStatus;
  /** Société détentrice déduite de la colonne « Signature » (ICC LABEGE…). */
  holderCompanyLabel: string | null;
  conventionDate: Date | null;
  kbisDate: Date | null;
  holderName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  remunerationLabel: string | null;
  remuneration: RemunerationRule | null;
}

export interface NormalizedVersement {
  apporteurName: string;
  enseigne: string | null;
  /** Société ICC qui encaisse (ICC FINANCE, ICC DEVELOPPEMENT…). */
  companyLabel: string | null;
  /** Agence d'origine quand la colonne porte une agence (Toulouse, Colomiers…). */
  agencyLabel: string | null;
  commercialName: string;
  type: VersementType;
  year: number;
  month: number | null;
  dossierLabel: string;
  amountCents: number;
  commissionCents: number | null;
  feesCents: number | null;
  paymentMode: ReturnType<typeof parsePaymentMode>["mode"];
  paymentRef: string | null;
  invoiceReceived: boolean;
  paymentDate: Date | null;
  sirenKbis: string | null;
  sirenInvoice: string | null;
  sirenVerified: boolean;
  signatureStatus: ConventionStatus;
  holderCompanyLabel: string | null;
  status: VersementStatus;
  sourceSheet: string;
  /** N° de ligne dans la feuille d'origine (déduplication et traçabilité). */
  sourceRow: number;
}

export interface RowResult<T> {
  /** N° de ligne 1-basé dans la feuille (pour l'affichage du rapport). */
  rowNumber: number;
  label: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  value?: T;
}

// --------------------------------------------------------------------------
// Feuille « conventions »
// --------------------------------------------------------------------------

export function mapConventionRow(
  row: Cell[],
  layout: ColumnLayout<ConventionKey>,
  rowNumber: number,
): RowResult<NormalizedConvention> | null {
  const rawApporteur = cellAt(row, layout, "apporteur");
  const label = parseApporteurLabel(rawApporteur);
  if (!label.name) return null;

  const errors: string[] = [];
  const warnings: string[] = [];

  const remunerationLabel = str(cellAt(row, layout, "remuneration")) || null;
  const remuneration = parseRemunerationLabel(remunerationLabel);
  if (remunerationLabel && !remuneration) {
    warnings.push(`Rémunération non interprétée : « ${remunerationLabel} » (à structurer).`);
  }
  if (!remunerationLabel) warnings.push("Rémunération non renseignée.");

  const signature = parseSignature(cellAt(row, layout, "signature"));
  const siren = normalizeSiren(cellAt(row, layout, "siren"));
  if (!siren) warnings.push("SIREN absent ou invalide : apporteur identifié par son nom.");

  const numberCell = cellAt(row, layout, "numero");
  const postal = str(cellAt(row, layout, "codePostal"));

  return {
    rowNumber,
    label: label.name,
    ok: errors.length === 0,
    errors,
    warnings,
    value: {
      apporteurName: label.name,
      enseigne: label.enseigne,
      siren,
      number: numberCell === null || numberCell === undefined ? null : str(numberCell) || null,
      requestedBy: str(cellAt(row, layout, "demandePar")) || null,
      signatureStatus: signature.status,
      holderCompanyLabel: signature.holderLabel,
      conventionDate: toDate(cellAt(row, layout, "dateConvention")),
      kbisDate: toDate(cellAt(row, layout, "dateKbis")),
      holderName: str(cellAt(row, layout, "titulaire")) || null,
      address: str(cellAt(row, layout, "adresse")) || null,
      postalCode: postal || null,
      city: str(cellAt(row, layout, "ville")) || null,
      remunerationLabel,
      remuneration,
    },
  };
}

// --------------------------------------------------------------------------
// Feuille « versements »
// --------------------------------------------------------------------------

/** Année de repli déduite du nom de feuille (« Suivi apporteurs 2024 »). */
export function yearFromSheetName(sheetName: string): number | null {
  const full = sheetName.match(/(20\d{2})/);
  if (full) return Number(full[1]);
  // Exercices « 20-21 » / « 21-22 » : on retient la 2e année (clôture).
  const split = sheetName.match(/\b(\d{2})\s*-\s*(\d{2})\b/);
  if (split) return 2000 + Number(split[2]);
  return null;
}

function mapType(value: Cell): VersementType {
  const key = norm(value);
  if (key.startsWith("don")) return "DON";
  if (key.startsWith("parrain")) return "PARRAINAGE";
  return "RISTOURNE";
}

export function mapVersementRow(
  row: Cell[],
  layout: ColumnLayout<VersementKey>,
  rowNumber: number,
  sheetName: string,
): RowResult<NormalizedVersement> | null {
  const label = parseApporteurLabel(cellAt(row, layout, "apporteur"));
  const dossierLabel = str(cellAt(row, layout, "dossier"));
  const montantCell = cellAt(row, layout, "montant");

  // Ligne vide (ou ligne de total) → ignorée silencieusement.
  if (!label.name && !dossierLabel && toCents(montantCell) === null) return null;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!label.name) errors.push("Apporteur manquant.");
  if (!dossierLabel) warnings.push("Dossier non renseigné.");

  const paymentDate = toDate(cellAt(row, layout, "datePaiement"));
  const yearCell = cellAt(row, layout, "annee");
  const year =
    (typeof yearCell === "number" && yearCell > 2000 ? Math.trunc(yearCell) : null) ??
    (yearCell ? Number.parseInt(str(yearCell), 10) || null : null) ??
    yearFromSheetName(sheetName) ??
    paymentDate?.getFullYear() ??
    null;
  if (year === null) errors.push("Année indéterminée (ni colonne « Année », ni nom de feuille).");

  const amountCents = toCents(montantCell) ?? 0;
  const cancelled =
    label.cancelled ||
    isCancelled(
      montantCell,
      cellAt(row, layout, "paiement"),
      cellAt(row, layout, "facture"),
      cellAt(row, layout, "datePaiement"),
      cellAt(row, layout, "sirenKbis"),
    );

  const payment = parsePaymentMode(cellAt(row, layout, "paiement"));
  const signature = parseSignature(cellAt(row, layout, "verifSignature"));
  const agenceLabel = str(cellAt(row, layout, "agence"));
  const isCompany = /^icc\b/i.test(agenceLabel);

  const verifSiren = cellAt(row, layout, "verifSiren");
  const sirenVerified =
    verifSiren === true || norm(verifSiren) === "true" || norm(verifSiren) === "vrai";

  const commercialName = str(cellAt(row, layout, "commercial"));
  if (!commercialName) warnings.push("Commercial non renseigné.");

  const value: NormalizedVersement = {
    apporteurName: label.name,
    enseigne: label.enseigne,
    companyLabel: isCompany ? agenceLabel.toUpperCase() : null,
    agencyLabel: !isCompany && agenceLabel ? agenceLabel : null,
    commercialName,
    type: mapType(cellAt(row, layout, "type")),
    year: year ?? 0,
    month: parseMonth(cellAt(row, layout, "mois")),
    dossierLabel: dossierLabel || "—",
    amountCents,
    commissionCents: toCents(cellAt(row, layout, "commission")),
    feesCents: toCents(cellAt(row, layout, "honoraires")),
    paymentMode: payment.mode,
    paymentRef: payment.ref,
    invoiceReceived: norm(cellAt(row, layout, "facture")) === "ok",
    paymentDate,
    sirenKbis: normalizeSiren(cellAt(row, layout, "sirenKbis")),
    sirenInvoice: normalizeSiren(cellAt(row, layout, "sirenFacture")),
    sirenVerified,
    signatureStatus: signature.status,
    holderCompanyLabel: signature.holderLabel,
    status: resolveVersementStatus({ cancelled, paymentDate, amountCents }),
    sourceSheet: sheetName,
    sourceRow: rowNumber,
  };

  return {
    rowNumber,
    label: `${label.name} — ${value.dossierLabel}`,
    ok: errors.length === 0,
    errors,
    warnings,
    value: errors.length === 0 ? value : undefined,
  };
}

// --------------------------------------------------------------------------
// Classeur complet
// --------------------------------------------------------------------------

export interface SheetInput {
  name: string;
  aoa: Cell[][];
}

export interface WorkbookParseResult {
  conventions: RowResult<NormalizedConvention>[];
  versements: RowResult<NormalizedVersement>[];
  /** Feuilles reconnues, par type (rapport d'import). */
  sheets: { name: string; kind: "conventions" | "versements"; rows: number }[];
  /** Feuilles ignorées (coordonnées, listes par commercial, calculs annexes). */
  ignoredSheets: string[];
}

/**
 * Analyse un classeur complet : chaque feuille est reconnue comme feuille de
 * conventions, de versements, ou ignorée. L'ordre des feuilles n'a pas
 * d'importance : les apporteurs sont rapprochés par nom (et SIREN) en aval.
 */
export function parseApporteursWorkbook(sheets: SheetInput[]): WorkbookParseResult {
  const conventions: RowResult<NormalizedConvention>[] = [];
  const versements: RowResult<NormalizedVersement>[] = [];
  const report: WorkbookParseResult["sheets"] = [];
  const ignoredSheets: string[] = [];

  for (const sheet of sheets) {
    const aoa = sheet.aoa ?? [];
    const conventionLayout = detectConventionLayout(aoa);
    if (conventionLayout) {
      let count = 0;
      for (let r = conventionLayout.headerRowIndex + 1; r < aoa.length; r++) {
        const res = mapConventionRow(aoa[r] ?? [], conventionLayout, r + 1);
        if (res) {
          conventions.push(res);
          count++;
        }
      }
      report.push({ name: sheet.name, kind: "conventions", rows: count });
      continue;
    }

    const versementLayout = detectVersementLayout(aoa);
    if (versementLayout) {
      let count = 0;
      for (let r = versementLayout.headerRowIndex + 1; r < aoa.length; r++) {
        const res = mapVersementRow(aoa[r] ?? [], versementLayout, r + 1, sheet.name);
        if (res) {
          versements.push(res);
          count++;
        }
      }
      report.push({ name: sheet.name, kind: "versements", rows: count });
      continue;
    }

    ignoredSheets.push(sheet.name);
  }

  return { conventions, versements, sheets: report, ignoredSheets };
}
