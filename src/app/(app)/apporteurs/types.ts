import type {
  ApporteurStatus,
  ConventionStatus,
  PaymentMode,
  RemunerationBase,
  RemunerationType,
  VersementStatus,
  VersementType,
} from "@prisma/client";

/**
 * DTO sérialisables du module « Apporteurs » (dates en ISO, montants en euros).
 * Les montants sont **null** lorsque le rôle n'est pas habilité à les voir
 * (minimisation côté serveur, cf. CLAUDE.md §4).
 */

export interface ConventionDTO {
  id: string;
  apporteurId: string;
  number: string | null;
  requestedBy: string | null;
  signatureStatus: ConventionStatus;
  conventionDate: string | null;
  kbisDate: string | null;
  holderName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  endDate: string | null;
  companyId: string | null;
  companyName: string | null;
  notes: string | null;
  remunerationType: RemunerationType;
  remunerationRate: number | null;
  remunerationFixed: number | null;
  remunerationCap: number | null;
  remunerationBase: RemunerationBase;
  /** Libellé lisible de la règle (« 30 % TTC de la commission — plafond 500 € »). */
  remunerationLabel: string;
}

export interface ApporteurDTO {
  id: string;
  name: string;
  siren: string | null;
  enseigne: string | null;
  holderName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  kbisDate: string | null;
  ribReceived: boolean;
  status: ApporteurStatus;
  companyId: string | null;
  companyName: string | null;
  notes: string | null;
  conventions: ConventionDTO[];
  /** Convention de référence (la plus récente non résiliée). */
  activeConvention: ConventionDTO | null;
  /** Cumuls tous exercices confondus. */
  versementCount: number;
  totalPaid: number | null;
  lastPaymentDate: string | null;
}

export interface VersementDTO {
  id: string;
  apporteurId: string;
  apporteurName: string;
  apporteurSiren: string | null;
  conventionId: string | null;
  conventionStatus: ConventionStatus | null;
  conventionRule: string | null;
  companyId: string | null;
  companyName: string | null;
  agencyId: string | null;
  agencyName: string | null;
  commercialName: string;
  memberId: string | null;
  type: VersementType;
  year: number;
  month: number | null;
  dossierLabel: string;
  acteloCaseId: string | null;
  amount: number | null;
  commission: number | null;
  fees: number | null;
  paymentMode: PaymentMode;
  paymentRef: string | null;
  invoiceReceived: boolean;
  paymentDate: string | null;
  sirenKbis: string | null;
  sirenInvoice: string | null;
  sirenVerified: boolean;
  status: VersementStatus;
  notes: string | null;
  /** Taux de rétrocession constatés (null si l'assiette est inconnue). */
  pctCommission: number | null;
  pctFees: number | null;
  /** Contrôle vs règle de la convention. */
  expectedAmount: number | null;
  deltaAmount: number | null;
  /** Anomalies détectées (alertes back-office). */
  flags: VersementFlag[];
}

export type VersementFlag =
  | "CONVENTION_MANQUANTE"
  | "CONVENTION_NON_SIGNEE"
  | "RISTOURNE_NON_VERSEE"
  | "SIREN_NON_VERIFIE"
  | "KBIS_MANQUANT"
  | "ECART_CONVENTION";

export interface ApporteurKpis {
  apporteursActifs: number;
  /** Montant versé sur l'exercice sélectionné (null si non habilité). */
  totalVerse: number | null;
  /** Encours : versements à payer sur l'exercice. */
  encoursCount: number;
  encoursMontant: number | null;
  /** Conventions à régulariser (à faire / non signées). */
  conventionsARegulariser: number;
  /** Nombre de versements portant au moins une anomalie. */
  anomalies: number;
}

export interface CompanyOption {
  id: string;
  name: string;
}

export interface AgencyOption {
  id: string;
  name: string;
}

export interface ApporteurOption {
  id: string;
  name: string;
  siren: string | null;
}
