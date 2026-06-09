import type { ContractType, NetworkType } from "@prisma/client";

/** Libellés métier FR (cf. cahier des charges). */

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
