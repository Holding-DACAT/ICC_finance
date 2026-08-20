/**
 * Règles métier « apporteurs d'affaires » (suivi back-office).
 *
 * Module **pur** (aucune dépendance Prisma) afin d'être testable unitairement :
 * il porte l'interprétation de la règle de rétrocession d'une convention, le
 * calcul de la ristourne attendue, les écarts et les normalisations issues du
 * classeur historique (mois, SIREN, statuts de signature).
 *
 * Convention de montants : **centimes TTC** (les conventions raisonnent en
 * « % TTC », cf. arbitrage du lot). Aucun calcul de TVA n'est fait ici.
 */

import type {
  ConventionStatus,
  PaymentMode,
  RemunerationBase,
  RemunerationType,
  VersementStatus,
} from "@prisma/client";

// --------------------------------------------------------------------------
// Montants
// --------------------------------------------------------------------------

/** Convertit un montant en euros (nombre ou texte « 1 234,56 € ») en centimes. */
export function toCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) : null;
  }
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/\u00a0/g, " ")
    .replace(/[€\s]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number.parseFloat(cleaned) * 100);
}

/** Centimes → euros (nombre) pour l'affichage et les exports. */
export function fromCents(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

/**
 * Ratio `part / base`, ou `null` quand la base est absente ou nulle.
 * Remplace les `#DIV/0!` du tableur d'origine.
 */
export function ratio(partCents: number | null, baseCents: number | null): number | null {
  if (partCents === null || baseCents === null || baseCents === 0) return null;
  return partCents / baseCents;
}

// --------------------------------------------------------------------------
// Règle de rétrocession
// --------------------------------------------------------------------------

/** Règle de rétrocession structurée, telle que portée par une convention. */
export interface RemunerationRule {
  type: RemunerationType;
  /** Taux (0.30 pour 30 %) — renseigné si `type === "POURCENTAGE"`. */
  rate: number | null;
  /** Forfait TTC en centimes — renseigné si `type === "FORFAIT"`. */
  fixedCents: number | null;
  /** Plafond TTC en centimes (null = non plafonnée). */
  capCents: number | null;
  base: RemunerationBase;
}

const EMPTY_RULE: RemunerationRule = {
  type: "AUCUNE",
  rate: null,
  fixedCents: null,
  capCents: null,
  base: "COMMISSION",
};

/**
 * Interprète le libellé libre du classeur (« 30% TTC - Plafond 500€ »,
 * « 50% TTC - Non plafonnée », « 500€ TTC », « Aucun rétro-commissionnement »)
 * en règle structurée. Retourne `null` si le libellé est vide.
 */
export function parseRemunerationLabel(label: string | null | undefined): RemunerationRule | null {
  if (!label) return null;
  const text = String(label).replace(/\u00a0/g, " ").trim();
  if (!text) return null;

  if (/aucun/i.test(text)) return { ...EMPTY_RULE };

  // Plafond éventuel : « Plafond 500€ », « plafonnée à 500 € ».
  let capCents: number | null = null;
  const cap = text.match(/plafond(?:n[ée]e?)?\s*(?:à|a|de|:)?\s*([\d\s.,]+)\s*€?/i);
  if (cap && !/non\s+plafonn/i.test(text)) {
    capCents = toCents(cap[1]);
  }

  const percent = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (percent) {
    const rate = Number.parseFloat(percent[1].replace(",", ".")) / 100;
    return {
      type: "POURCENTAGE",
      rate: Number.isFinite(rate) ? rate : null,
      fixedCents: null,
      capCents,
      base: "COMMISSION",
    };
  }

  // Forfait : « 500€ TTC », « 1500 ». On ignore le montant du plafond déjà lu.
  const withoutCap = cap ? text.replace(cap[0], " ") : text;
  const amount = withoutCap.match(/([\d]+(?:[\s.,]\d+)*)\s*€?/);
  const fixedCents = amount ? toCents(amount[1]) : null;
  if (fixedCents !== null) {
    return { type: "FORFAIT", rate: null, fixedCents, capCents, base: "COMMISSION" };
  }

  return null;
}

/** Libellé lisible d'une règle de rétrocession (UI et export). */
export function formatRemunerationRule(rule: RemunerationRule): string {
  if (rule.type === "NON_RENSEIGNEE") return "Rétrocession non renseignée";
  if (rule.type === "AUCUNE") return "Aucun rétro-commissionnement";
  const baseLabel = rule.base === "COMMISSION" ? "commission" : "honoraires";
  const cap =
    rule.capCents !== null
      ? ` — plafond ${fromCents(rule.capCents).toLocaleString("fr-FR")} €`
      : " — non plafonnée";
  if (rule.type === "FORFAIT") {
    return `Forfait ${fromCents(rule.fixedCents).toLocaleString("fr-FR")} € TTC${
      rule.capCents !== null ? cap : ""
    }`;
  }
  const pct = rule.rate !== null ? Math.round(rule.rate * 1000) / 10 : 0;
  return `${pct} % TTC de la ${baseLabel}${cap}`;
}

/** Assiette de calcul d'un versement, selon la base de la convention. */
export interface VersementBase {
  commissionCents: number | null;
  feesCents: number | null;
}

/**
 * Ristourne **attendue** au titre de la convention pour un dossier donné.
 * Retourne `null` quand la règle n'est pas documentée ou que l'assiette
 * nécessaire n'est pas connue (le contrôle d'écart est alors impossible,
 * pas faux).
 */
export function expectedAmountCents(
  rule: RemunerationRule | null,
  base: VersementBase,
): number | null {
  if (!rule || rule.type === "NON_RENSEIGNEE") return null;
  if (rule.type === "AUCUNE") return 0;
  if (rule.type === "FORFAIT") {
    if (rule.fixedCents === null) return null;
    return rule.capCents !== null ? Math.min(rule.fixedCents, rule.capCents) : rule.fixedCents;
  }
  if (rule.rate === null) return null;
  const assiette = rule.base === "COMMISSION" ? base.commissionCents : base.feesCents;
  // Assiette absente OU à zéro (fréquent dans le classeur quand la colonne
  // n'est pas renseignée) : le contrôle n'est pas possible.
  if (assiette === null || assiette <= 0) return null;
  const raw = Math.round(rule.rate * assiette);
  return rule.capCents !== null ? Math.min(raw, rule.capCents) : raw;
}

/** Tolérance d'écart : 1 € ou 1 % de l'attendu (arrondis du tableur d'origine). */
export function ecartToleranceCents(expected: number): number {
  return Math.max(100, Math.round(Math.abs(expected) * 0.01));
}

export interface EcartResult {
  /** Montant attendu (centimes) ou null si l'assiette est inconnue. */
  expectedCents: number | null;
  /** Versé − attendu (centimes) ou null. */
  deltaCents: number | null;
  /** true si l'écart dépasse la tolérance. */
  isAnomaly: boolean;
}

/** Compare le montant réellement versé à la règle de la convention. */
export function computeEcart(
  rule: RemunerationRule | null,
  base: VersementBase,
  paidCents: number,
): EcartResult {
  const expectedCents = expectedAmountCents(rule, base);
  if (expectedCents === null) return { expectedCents: null, deltaCents: null, isAnomaly: false };
  const deltaCents = paidCents - expectedCents;
  return {
    expectedCents,
    deltaCents,
    isAnomaly: Math.abs(deltaCents) > ecartToleranceCents(expectedCents),
  };
}

// --------------------------------------------------------------------------
// Normalisations (reprise du classeur)
// --------------------------------------------------------------------------

const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

/** Supprime accents/casse pour comparer des libellés du fichier source. */
export function deaccent(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** « Décembre », « aout », une date… → numéro de mois (1-12) ou null. */
export function parseMonth(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getMonth() + 1;
  if (typeof value === "number") {
    return value >= 1 && value <= 12 ? Math.trunc(value) : null;
  }
  if (typeof value !== "string") return null;
  const key = deaccent(value);
  const index = MONTHS.findIndex((m) => key.startsWith(m.slice(0, 4)) && key.length <= 12);
  return index >= 0 ? index + 1 : null;
}

export const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

/** Libellé FR d'un mois (1-12), « — » si absent. */
export function formatMonth(month: number | null | undefined): string {
  if (!month || month < 1 || month > 12) return "—";
  return MONTH_LABELS[month - 1];
}

/**
 * Normalise un SIREN : 9 chiffres attendus. Les valeurs de remplissage du
 * classeur (`0`, `NON …`, `#N/A`, texte libre) sont rejetées.
 */
export function normalizeSiren(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 9) return null;
  if (/^0+$/.test(digits)) return null;
  return digits;
}

/** Sociétés ICC détentrices repérées dans la colonne « Signature ». */
const HOLDER_LABELS = ["labege", "muret"];

export interface SignatureParseResult {
  status: ConventionStatus;
  /** Société détentrice quand la cellule contient « LABEGE » / « MURET ». */
  holderLabel: string | null;
}

/**
 * Interprète la colonne « Signature » / « Vérif signature convention » :
 * OK → signée, A FAIRE → à faire, NOK → non signée, STOP → résiliée.
 * `LABEGE` / `MURET` désignent la société détentrice : le statut reste « à
 * faire » (à vérifier) et le libellé est remonté à part.
 */
export function parseSignature(value: unknown): SignatureParseResult {
  const raw = value === null || value === undefined ? "" : String(value);
  const key = deaccent(raw);
  if (!key || key === "#n/a" || key === "0") return { status: "A_FAIRE", holderLabel: null };
  const holder = HOLDER_LABELS.find((h) => key.includes(h));
  if (holder) {
    return { status: "A_FAIRE", holderLabel: `ICC ${holder.toUpperCase()}` };
  }
  if (key.startsWith("ok")) return { status: "SIGNEE", holderLabel: null };
  if (key.startsWith("stop")) return { status: "RESILIEE", holderLabel: null };
  if (key.startsWith("nok") || key.startsWith("non")) {
    return { status: "NON_SIGNEE", holderLabel: null };
  }
  return { status: "A_FAIRE", holderLabel: null };
}

/** Mode de paiement : « virement », « deduit », n° de chèque… */
export function parsePaymentMode(value: unknown): { mode: PaymentMode; ref: string | null } {
  if (value === null || value === undefined || value === "") {
    return { mode: "AUTRE", ref: null };
  }
  const raw = String(value).trim();
  const key = deaccent(raw);
  if (key.startsWith("virement")) return { mode: "VIREMENT", ref: null };
  if (key.startsWith("deduit")) return { mode: "DEDUIT", ref: null };
  if (key.startsWith("cheque") || key.startsWith("chq")) return { mode: "CHEQUE", ref: null };
  // Un numéro seul dans cette colonne est un numéro de chèque.
  if (/^\d{5,}$/.test(key)) return { mode: "CHEQUE", ref: raw };
  return { mode: "AUTRE", ref: raw };
}

/**
 * Statut d'un versement : « annulé » dans le fichier source, versé dès qu'une
 * date de versement existe, sinon à verser.
 */
export function resolveVersementStatus(params: {
  cancelled: boolean;
  paymentDate: Date | null;
  amountCents: number;
}): VersementStatus {
  if (params.cancelled) return "ANNULE";
  if (params.paymentDate && params.amountCents > 0) return "VERSE";
  return "A_VERSER";
}
