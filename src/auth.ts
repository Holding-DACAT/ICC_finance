import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Couche d'authentification — adaptateur **Clerk** (cf. lot « Accès utilisateurs »).
 *
 * Les écrans et Server Actions consomment toujours `auth()` puis `session.user`
 * (id, email, name, role, scopedAgencyId) : on conserve cette signature pour
 * éviter de réécrire tous les appels. La source de vérité des rôles est désormais
 * Clerk (`publicMetadata.role` / `publicMetadata.scopedAgencyId`).
 */

export interface SessionUser {
  /** Identifiant interne (table User) si l'e-mail est connu, sinon l'id Clerk. */
  id: string;
  email: string;
  name: string;
  role: Role;
  scopedAgencyId: string | null;
}

export interface Session {
  user: SessionUser;
}

interface AppMetadata {
  role?: Role;
  scopedAgencyId?: string | null;
}

/**
 * Renvoie la session courante (ou `null` si non authentifié). À utiliser
 * uniquement côté serveur (Server Components, Server Actions, Route Handlers).
 */
export async function auth(): Promise<Session | null> {
  const { userId } = await clerkAuth();
  if (!userId) return null;

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";
  const meta = (user?.publicMetadata ?? {}) as AppMetadata;
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email ||
    "Utilisateur";

  // Identifiant interne pour les relations (audit, onboarding) : rapproché par
  // e-mail si une fiche User existe ; sinon on retombe sur l'id Clerk.
  let internalId = userId;
  if (email) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (dbUser) internalId = dbUser.id;
    } catch {
      // Base indisponible (ex. build) : on conserve l'id Clerk.
    }
  }

  return {
    user: {
      id: internalId,
      email,
      name,
      // Principe de moindre privilège : LECTURE par défaut (cf. CLAUDE.md §4).
      role: meta.role ?? "LECTURE",
      scopedAgencyId: meta.scopedAgencyId ?? null,
    },
  };
}
