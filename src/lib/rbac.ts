import type { Role } from "@prisma/client";

import { auth } from "@/auth";

/**
 * Contrôle d'accès — par rôle ET par périmètre d'agence (cf. CLAUDE.md §4/§5).
 * À utiliser systématiquement côté serveur, jamais seulement dans l'UI.
 */

/** Permissions de lecture par module. Affiné au fil des lots. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  RH: "Ressources humaines",
  IT: "Informatique",
  BACK_OFFICE: "Back-office",
  DIRECTEUR_AGENCE: "Directeur d'agence",
  LECTURE: "Lecture seule",
};

/** Renvoie la session authentifiée ou lève une erreur (à protéger en amont). */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }
  return session;
}

/** Vérifie que l'utilisateur courant possède l'un des rôles attendus. */
export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  return session;
}

/** Rôles autorisés à écrire dans le module « Apporteurs » (back-office). */
export const APPORTEUR_WRITE_ROLES = ["ADMIN", "BACK_OFFICE"] as const;

/** Rôles autorisés à consulter le module « Apporteurs ». */
export const APPORTEUR_READ_ROLES = ["ADMIN", "BACK_OFFICE", "DIRECTEUR_AGENCE"] as const;

export function canWriteApporteurs(role: Role): boolean {
  return (APPORTEUR_WRITE_ROLES as readonly Role[]).includes(role);
}

export function canReadApporteurs(role: Role): boolean {
  return (APPORTEUR_READ_ROLES as readonly Role[]).includes(role);
}

/**
 * Montants de rétrocession : réservés au back-office et à l'administration.
 * Un directeur d'agence consulte le suivi de son agence sans les montants
 * (minimisation des données, cf. CLAUDE.md §4).
 */
export function canSeeApporteurAmounts(role: Role): boolean {
  return canWriteApporteurs(role);
}

/**
 * Vérifie qu'un utilisateur peut accéder à une agence donnée.
 * Un DIRECTEUR_AGENCE est restreint à son périmètre (`scopedAgencyId`).
 */
export function canAccessAgency(
  user: { role: Role; scopedAgencyId: string | null },
  agencyId: string,
): boolean {
  if (user.role === "DIRECTEUR_AGENCE") {
    return user.scopedAgencyId === agencyId;
  }
  return true;
}
