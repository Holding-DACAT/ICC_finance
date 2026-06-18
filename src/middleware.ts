import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Middleware Clerk : protège toutes les pages hors routes publiques.
 * - `/login`, `/sign-up` : écrans d'authentification (connexion + invitations).
 * - `/api/cron/*`, `/api/admin/seed` : protégés par `CRON_SECRET` (pas de session).
 */
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-up(.*)",
  "/api/cron(.*)",
  "/api/admin/seed(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers internes Next et les assets statiques.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|gif|png|svg|ico|webp|woff2?|ttf|map)).*)",
    // Toujours exécuter pour les routes API.
    "/(api|trpc)(.*)",
  ],
};
