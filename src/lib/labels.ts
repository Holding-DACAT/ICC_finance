import type {
  ApporteurStatus,
  ContractType,
  ConventionStatus,
  MemberStatus,
  NetworkType,
  PaymentMode,
  RemunerationBase,
  RemunerationType,
  VersementStatus,
  VersementType,
} from "@prisma/client";

/** Libellés métier FR (cf. cahier des charges). */

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  EN_COURS_ENREGISTREMENT: "En cours d'enregistrement",
};

export const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  MANDAT: "Contrat de Mandat",
  FRANCHISE: "Contrat de Franchise",
};

export const NETWORK_LABELS: Record<NetworkType, string> = {
  FRANCHISE: "Franchise",
  FILIALE: "Filiale",
  AFFILIE: "Affilié",
};

export const ORIAS_LABELS: Record<string, string> = {
  COBSP: "Courtier en opérations de banque et services de paiement",
  MOBSP: "Mandataire en opérations de banque et services de paiement",
  MIOBSP: "Mandataire d'intermédiaire en opérations de banque",
  COA: "Courtier en assurance",
  MIAS: "Mandataire en assurance",
  MIA: "Mandataire d'intermédiaire d'assurance",
  CIF: "Conseiller en investissements financiers",
  IFP: "Intermédiaire en financement participatif",
};

// ----------------------------- Apporteurs -------------------------------

export const APPORTEUR_STATUS_LABELS: Record<ApporteurStatus, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
};

export const CONVENTION_STATUS_LABELS: Record<ConventionStatus, string> = {
  SIGNEE: "Signée",
  A_FAIRE: "À faire",
  NON_SIGNEE: "Non signée",
  RESILIEE: "Résiliée",
};

export const REMUNERATION_TYPE_LABELS: Record<RemunerationType, string> = {
  POURCENTAGE: "Pourcentage",
  FORFAIT: "Forfait",
  AUCUNE: "Aucun rétro-commissionnement",
  NON_RENSEIGNEE: "Non renseignée",
};

export const REMUNERATION_BASE_LABELS: Record<RemunerationBase, string> = {
  COMMISSION: "Commission bancaire",
  HONORAIRES: "Honoraires de courtage",
};

export const VERSEMENT_TYPE_LABELS: Record<VersementType, string> = {
  RISTOURNE: "Ristourne",
  DON: "Don",
  PARRAINAGE: "Parrainage",
};

export const VERSEMENT_STATUS_LABELS: Record<VersementStatus, string> = {
  A_VERSER: "À verser",
  VERSE: "Versé",
  ANNULE: "Annulé",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  DEDUIT: "Déduit",
  AUTRE: "Autre",
};
