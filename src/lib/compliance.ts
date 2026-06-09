import type { ComplianceStatus } from "@prisma/client";

/** Fenêtre d'alerte avant échéance (jours) pour ORIAS / RC Pro / garantie. */
export const RENEWAL_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Nombre de jours entre aujourd'hui et une date (négatif si passée). */
export function daysUntil(date: Date | string, now: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((d.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Statut de conformité (cf. docs/02) : EXPIRE si échéance passée,
 * A_RENOUVELER si < 60 jours, sinon A_JOUR. Sans date → A_JOUR.
 */
export function computeComplianceStatus(
  renewalDate: Date | string | null | undefined,
  now: Date = new Date(),
): ComplianceStatus {
  if (!renewalDate) return "A_JOUR";
  const days = daysUntil(renewalDate, now);
  if (days < 0) return "EXPIRE";
  if (days <= RENEWAL_WINDOW_DAYS) return "A_RENOUVELER";
  return "A_JOUR";
}

/**
 * État le plus défavorable parmi plusieurs échéances (ORIAS, RC Pro, garantie) :
 * EXPIRE > A_RENOUVELER > A_JOUR.
 */
export function worstCompliance(...statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes("EXPIRE")) return "EXPIRE";
  if (statuses.includes("A_RENOUVELER")) return "A_RENOUVELER";
  return "A_JOUR";
}
