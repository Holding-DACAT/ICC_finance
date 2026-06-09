import type { NextAuthConfig } from "next-auth";

/**
 * Configuration de base, compatible Edge (AUCUN import Prisma ici).
 * Utilisée par le middleware pour protéger les routes. Les providers et les
 * callbacks nécessitant la base de données sont ajoutés dans `src/auth.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    /** Routes publiques : /login et les routes d'auth ; tout le reste exige une session. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/api/admin/seed");
      if (isPublic) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
