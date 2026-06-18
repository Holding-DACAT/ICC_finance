/**
 * Import « Liste du Réseau » — mapping & validation du fichier Excel/CSV
 * transmis par le groupe (cf. CLAUDE.md §1, alimentation de la base RH).
 *
 * Ce module est volontairement **pur** (aucune dépendance Prisma ni xlsx) afin
 * d'être testable unitairement : il transforme un tableau de cellules brutes
 * (array-of-arrays) en lignes normalisées et validées, prêtes à être insérées
 * par la Server Action d'import.
 *
 * Colonnes attendues (en-têtes du fichier, tolérantes aux accents/casse) :
 *   Agence | Sexe | Nom | Prénom | n° Télephone | E-mail | Statut | Fonction |
 *   Date d'arrivée | Date départ | ORIAS | N°RCPRO
 * Les colonnes sensibles (mots de passe Orias/Afib/Votrasso) sont volontairement
 * IGNORÉES : on ne stocke jamais de secret en clair (cf. CLAUDE.md §4).
 */

import {
  contractTypes,
  memberStatuses,
  networkTypes,
  oriasCategories,
} from "@/lib/validations/member";

export type ContractType = (typeof contractTypes)[number];
export type NetworkType = (typeof networkTypes)[number];
export type MemberStatus = (typeof memberStatuses)[number];
export type OriasCategory = (typeof oriasCategories)[number];

/** Cellule brute issue d'une feuille (string | number | Date | null). */
type Cell = unknown;

type ColumnKey =
  | "agence"
  | "sexe"
  | "nom"
  | "prenom"
  | "telephone"
  | "email"
  | "statut"
  | "fonction"
  | "arrivee"
  | "depart"
  | "orias"
  | "rcpro";

/** En-têtes normalisés reconnus pour chaque colonne logique. */
const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  agence: ["agence", "agences"],
  sexe: ["sexe", "civilite", "genre"],
  nom: ["nom"],
  prenom: ["prenom"],
  telephone: ["n telephone", "telephone", "tel", "n tel", "numero de telephone", "mobile"],
  email: ["e mail", "email", "mail", "courriel", "adresse mail"],
  statut: ["statut", "statuts"],
  fonction: ["fonction", "fonctions"],
  arrivee: ["date d arrivee", "date arrivee", "arrivee", "date entree"],
  depart: ["date depart", "date de depart", "depart"],
  orias: ["orias", "n orias", "numero orias"],
  rcpro: ["n rcpro", "rcpro", "n rc pro", "rc pro", "numero rcpro"],
};

/** Normalise un libellé : sans accents, minuscules, ponctuation → espace. */
function norm(value: Cell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function str(value: Cell): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ColumnLayout {
  headerRowIndex: number;
  columns: Partial<Record<ColumnKey, number>>;
}

/**
 * Détecte la ligne d'en-tête et la position de chaque colonne. On accepte les
 * premières lignes « titre » (ex. « Liste du Réseau ») en scannant jusqu'à 15
 * lignes. Une feuille est reconnue si elle contient au moins Nom + Prénom et
 * (E-mail ou Agence).
 */
export function detectLayout(aoa: Cell[][]): ColumnLayout | null {
  const limit = Math.min(aoa.length, 15);
  for (let r = 0; r < limit; r++) {
    const row = aoa[r] ?? [];
    const columns: Partial<Record<ColumnKey, number>> = {};
    for (let c = 0; c < row.length; c++) {
      const header = norm(row[c]);
      if (!header) continue;
      for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
        if (columns[key] === undefined && HEADER_ALIASES[key].includes(header)) {
          columns[key] = c;
        }
      }
    }
    if (
      columns.nom !== undefined &&
      columns.prenom !== undefined &&
      (columns.email !== undefined || columns.agence !== undefined)
    ) {
      return { headerRowIndex: r, columns };
    }
  }
  return null;
}

/** Convertit une cellule (Date, n° de série Excel ou texte) en Date ou null. */
export function toDate(value: Cell): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // N° de série Excel : jours depuis le 30/12/1899.
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(Date.UTC(year, mm - 1, dd, 12));
    return Number.isNaN(d.getTime()) || mm < 1 || mm > 12 || dd < 1 || dd > 31 ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapCivility(sexe: string): string | null {
  const v = norm(sexe);
  if (v === "h" || v === "m" || v.startsWith("homm") || v.startsWith("mascu")) return "M.";
  if (v === "f" || v.startsWith("femm") || v.startsWith("femin")) return "Mme";
  return null;
}

/** Déduit le type de contrat depuis le statut (best-effort, ajustable ensuite). */
export function mapContractType(statut: string): ContractType {
  const v = norm(statut);
  if (v.includes("mandataire")) return "MANDAT";
  if (v.includes("franchise")) return "FRANCHISE";
  if (v.includes("alternant") || v.includes("stagiaire") || v.includes("apprenti")) return "CDD";
  return "CDI";
}

/** Extrait les catégories ORIAS reconnues depuis la colonne « Fonction ». */
export function mapOriasCategories(fonction: string): OriasCategory[] {
  const known = new Set<string>(oriasCategories);
  const tokens = norm(fonction).toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const out: OriasCategory[] = [];
  for (const t of tokens) {
    if (known.has(t) && !out.includes(t as OriasCategory)) out.push(t as OriasCategory);
  }
  return out;
}

export interface NormalizedMember {
  civility: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  contractType: ContractType;
  functionTitle: string;
  functionSub: string | null;
  network: NetworkType;
  status: MemberStatus;
  agencyName: string;
  arrivalDate: Date;
  departureDate: Date | null;
  oriasNumber: string | null;
  oriasCategories: OriasCategory[];
  rcProPolicy: string | null;
}

export interface RowResult {
  /** N° de ligne 1-basé dans la feuille (pour l'affichage). */
  rowNumber: number;
  agencyName: string;
  lastName: string;
  firstName: string;
  email: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  member?: NormalizedMember;
}

function cellAt(row: Cell[], layout: ColumnLayout, key: ColumnKey): Cell {
  const idx = layout.columns[key];
  return idx === undefined ? undefined : row[idx];
}

/**
 * Mappe une ligne de données. Renvoie `null` pour une ligne vide (à ignorer).
 */
export function mapRow(row: Cell[], layout: ColumnLayout, rowNumber: number): RowResult | null {
  const lastNameRaw = str(cellAt(row, layout, "nom"));
  const firstNameRaw = str(cellAt(row, layout, "prenom"));
  const agencyRaw = str(cellAt(row, layout, "agence"));
  const emailRaw = str(cellAt(row, layout, "email"));

  // Ligne entièrement vide → ignorée silencieusement.
  if (!lastNameRaw && !firstNameRaw && !agencyRaw && !emailRaw) return null;

  const errors: string[] = [];
  const warnings: string[] = [];

  const lastName = lastNameRaw.toUpperCase();
  const firstName = firstNameRaw;
  const agencyName = agencyRaw;

  if (!lastName) errors.push("Nom manquant.");
  if (!firstName) errors.push("Prénom manquant.");
  if (!agencyName) errors.push("Agence manquante.");

  let email = emailRaw.toLowerCase();
  if (!email) {
    if (firstName && lastName) {
      email = `${slug(firstName)}.${slug(lastName)}@icc-finance.fr`;
      warnings.push(`E-mail manquant : généré (${email}).`);
    } else {
      errors.push("E-mail manquant.");
    }
  } else {
    // Un e-mail ne peut pas contenir d'espace : on corrige ce type de coquille.
    const cleaned = email.replace(/\s+/g, "");
    if (cleaned !== email) {
      warnings.push(`Espace(s) retiré(s) de l'e-mail (« ${emailRaw} »).`);
      email = cleaned;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push(`E-mail invalide : « ${emailRaw} ».`);
    }
  }

  const arrivalDate = toDate(cellAt(row, layout, "arrivee"));
  if (!arrivalDate) errors.push("Date d'arrivée manquante ou invalide.");

  const departureDate = toDate(cellAt(row, layout, "depart"));
  const status: MemberStatus = departureDate ? "INACTIF" : "ACTIF";

  const statut = str(cellAt(row, layout, "statut"));
  let functionTitle = statut;
  if (!functionTitle) {
    functionTitle = "Non renseigné";
    warnings.push("Statut manquant : « Non renseigné » par défaut.");
  }
  const fonction = str(cellAt(row, layout, "fonction"));
  const phone = str(cellAt(row, layout, "telephone")) || null;
  const civility = mapCivility(str(cellAt(row, layout, "sexe")));
  const oriasNumber = str(cellAt(row, layout, "orias")) || null;
  const rcProPolicy = str(cellAt(row, layout, "rcpro")) || null;
  const categories = mapOriasCategories(fonction);

  const ok = errors.length === 0;
  const member: NormalizedMember | undefined = ok
    ? {
        civility,
        firstName,
        lastName,
        email,
        phone,
        contractType: mapContractType(statut),
        functionTitle,
        functionSub: fonction || null,
        network: "FILIALE",
        status,
        agencyName,
        arrivalDate: arrivalDate as Date,
        departureDate,
        oriasNumber,
        oriasCategories: categories,
        rcProPolicy,
      }
    : undefined;

  return { rowNumber, agencyName, lastName, firstName, email, ok, errors, warnings, member };
}

export interface ParsedSheet {
  layout: ColumnLayout;
  results: RowResult[];
}

/** Analyse une feuille complète (array-of-arrays) → lignes normalisées. */
export function parseNetworkSheet(
  aoa: Cell[][],
): { ok: true; data: ParsedSheet } | { ok: false; error: string } {
  const layout = detectLayout(aoa);
  if (!layout) {
    return {
      ok: false,
      error:
        "En-têtes introuvables : le fichier doit contenir au minimum les colonnes « Nom », « Prénom » et « Agence » ou « E-mail ».",
    };
  }
  const results: RowResult[] = [];
  for (let r = layout.headerRowIndex + 1; r < aoa.length; r++) {
    const res = mapRow(aoa[r] ?? [], layout, r + 1);
    if (res) results.push(res);
  }
  return { ok: true, data: { layout, results } };
}
