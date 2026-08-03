import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Outil de **diagnostic d'authentification Actelo** (admin/RH uniquement).
 *
 * Le schéma d'auth exact d'Actelo n'étant pas documenté, cette route essaie les
 * schémas les plus courants contre un endpoint léger (`/api/v1/agencies?limit=1`)
 * et indique lequel renvoie `200`. On configure ensuite `ACTELO_AUTH_HEADER` /
 * `ACTELO_AUTH_PREFIX` en conséquence (un seul redéploiement).
 *
 * Sécurité : ne renvoie **jamais** le token, seulement les codes HTTP obtenus.
 */

const SCHEMES: { header: string; prefix: string }[] = [
  { header: "Authorization", prefix: "Bearer " },
  { header: "Authorization", prefix: "" },
  { header: "Authorization", prefix: "Token " },
  { header: "X-API-Key", prefix: "" },
  { header: "x-api-key", prefix: "" },
  { header: "apikey", prefix: "" },
  { header: "X-Auth-Token", prefix: "" },
  { header: "token", prefix: "" },
];

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "RH")) {
    return NextResponse.json({ error: "Accès refusé (réservé ADMIN/RH)." }, { status: 403 });
  }

  const token = process.env.ACTELO_API_TOKEN;
  const base = (process.env.ACTELO_API_BASE_URL ?? "https://api.actelo.fr").replace(/\/$/, "");
  if (!token) {
    return NextResponse.json({ error: "ACTELO_API_TOKEN absent des variables d'environnement." }, { status: 400 });
  }

  const url = `${base}/api/v1/agencies?limit=1`;
  const results: Array<{ header: string; prefix: string; status: number | null; ok: boolean; error?: string }> = [];

  for (const s of SCHEMES) {
    try {
      const res = await fetch(url, {
        headers: { [s.header]: `${s.prefix}${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      results.push({ header: s.header, prefix: s.prefix, status: res.status, ok: res.ok });
    } catch (error) {
      results.push({
        header: s.header,
        prefix: s.prefix,
        status: null,
        ok: false,
        error: error instanceof Error ? error.message : "Erreur réseau",
      });
    }
  }

  const working = results.find((r) => r.ok);

  return NextResponse.json({
    endpoint: url,
    tokenPresent: true,
    tokenLength: token.length,
    working: working
      ? {
          header: working.header,
          prefix: working.prefix,
          envToSet: {
            ACTELO_AUTH_HEADER: working.header,
            ACTELO_AUTH_PREFIX: working.prefix,
          },
        }
      : null,
    hint: working
      ? `Schéma trouvé ✓ — sur Vercel, mettez ACTELO_AUTH_HEADER="${working.header}" et ACTELO_AUTH_PREFIX="${working.prefix}", puis redéployez.`
      : "Aucun schéma testé n'a renvoyé 200. Le token est probablement invalide/expiré, ou l'accès est restreint (IP, scope). Vérifiez le token côté Actelo.",
    results,
  });
}
