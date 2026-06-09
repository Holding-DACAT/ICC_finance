import { NextResponse } from "next/server";

/**
 * Vérifie l'autorisation d'un appel cron (Vercel envoie
 * `Authorization: Bearer <CRON_SECRET>`). Renvoie une réponse d'erreur si
 * le secret est manquant/incorrect, sinon `null`.
 */
export function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 500 });
  }
  const header = request.headers.get("authorization");
  const provided = header?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  return null;
}
