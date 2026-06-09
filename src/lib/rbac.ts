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
