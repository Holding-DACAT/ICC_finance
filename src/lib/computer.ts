import type { ComputerStatusValue } from "@/app/(app)/ordinateurs/types";
import { monthsSince } from "@/lib/format";

/**
 * Statut d'un poste dérivé de son âge (cf. docs/02_MODELE_DONNEES.md) :
 * À_RENOUVELER si > 34 mois, EXPIRÉ si > 36 mois, sinon ACTIF.
 */
export function computeComputerStatus(registrationDate: Date | string): ComputerStatusValue {
  const age = monthsSince(registrationDate);
  if (age > 36) return "EXPIRE";
  if (age > 34) return "A_RENOUVELER";
  return "ACTIF";
}

export const COMPUTER_STATUS_LABEL: Record<ComputerStatusValue, string> = {
  ACTIF: "ACTIF",
  A_RENOUVELER: "À RENOUV.",
  EXPIRE: "EXPIRÉ",
};
