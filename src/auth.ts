import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import type { Role } from "@prisma/client";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

/** Mode démo : aucun tenant Azure requis (cf. CLAUDE.md §8, intégrations mockées). */
export const USE_MOCKS = process.env.USE_INTEGRATION_MOCKS === "true";

/** Compte administrateur utilisé pour la connexion en mode démo. */
export const MOCK_ADMIN = {
  id: "mock-admin",
  email: "admin@icc-finance.fr",
  name: "Administrateur ICC (démo)",
  role: "ADMIN" as Role,
} as const;

const providers: Provider[] = USE_MOCKS
  ? [
      Credentials({
        id: "mock",
        name: "Mode démo",
        credentials: {},
        // En mode démo, la connexion réussit toujours avec un compte ADMIN.
        authorize: async () => ({
          id: MOCK_ADMIN.id,
          email: MOCK_ADMIN.email,
          name: MOCK_ADMIN.name,
          role: MOCK_ADMIN.role,
          scopedAgencyId: null,
        }),
      }),
    ]
  : [
      MicrosoftEntraID({
        clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      }),
    ];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Enrichit le token avec le rôle applicatif et le périmètre d'agence.
     * Source de vérité : table `User` (liée à Azure AD) ; à défaut, le rôle du
     * provider, sinon LECTURE (principe de moindre privilège, cf. CLAUDE.md §4).
     */
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.role = (user.role as Role) ?? "LECTURE";
        token.scopedAgencyId = user.scopedAgencyId ?? null;
      }
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, scopedAgencyId: true },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;
            token.scopedAgencyId = dbUser.scopedAgencyId;
          }
        } catch {
          // Base indisponible (ex. build) : on conserve les valeurs du provider.
        }
      }
      token.role ??= "LECTURE";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? "LECTURE";
        session.user.scopedAgencyId = (token.scopedAgencyId as string | null) ?? null;
      }
      return session;
    },
  },
});
