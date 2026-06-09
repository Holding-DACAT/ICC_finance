import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Middleware Edge : protège toutes les pages hors routes publiques (cf. authConfig).
export default NextAuth(authConfig).auth;

export const config = {
  // Exclut les assets statiques et les fichiers internes Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
