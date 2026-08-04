import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Outil de **diagnostic Actelo** (admin/RH uniquement).
 *
 * 1. Détecte le schéma d'authentification qui renvoie 200 (`/api/v1/agencies`).
 * 2. Sonde les vrais endpoints (agences, utilisateurs, dossiers) avec ce schéma
 *    et renvoie le **code HTTP + le corps de la réponse** (tronqué) — utile pour
 *    lire le motif exact d'un 400 Bad Request.
 *
 * Sécurité : ne renvoie jamais le token, seulement statuts et corps de réponse.
 */

const SCHEMES: { header: string; prefix: string }[] = [
  { header: "Authorization", prefix: "" },
  { header: "Authorization", prefix: "Bearer " },
  { header: "Authorization", prefix: "Token " },
  { header: "X-API-Key", prefix: "" },
  { header: "apikey", prefix: "" },
];

async function probe(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers: { ...headers, Accept: "application/json" }, cache: "no-store" });
    const text = await res.text();
    return { url, status: res.status, ok: res.ok, body: text.slice(0, 600) };
  } catch (error) {
    return { url, status: null, ok: false, body: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "RH")) {
    return NextResponse.json({ error: "Accès refusé (réservé ADMIN/RH)." }, { status: 403 });
  }

  const token = process.env.ACTELO_API_TOKEN;
  const base = (process.env.ACTELO_API_BASE_URL ?? "https://api.actelo.fr").replace(/\/$/, "");
  if (!token) {
    return NextResponse.json({ error: "ACTELO_API_TOKEN absent." }, { status: 400 });
  }

  // 1. Schéma d'auth qui fonctionne (contre un endpoint léger connu OK).
  const authTests: Array<{ header: string; prefix: string; status: number | null; ok: boolean }> = [];
  for (const s of SCHEMES) {
    const r = await probe(`${base}/api/v1/agencies?limit=1`, { [s.header]: `${s.prefix}${token}` });
    authTests.push({ header: s.header, prefix: s.prefix, status: r.status, ok: r.ok });
  }
  const working = authTests.find((t) => t.ok) ?? { header: "Authorization", prefix: "" };
  const authHeaders = { [working.header]: `${working.prefix}${token}` };

  // 2. Sonde des vrais endpoints, avec variantes de paramètres pour isoler un 400.
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = now.toISOString();

  const endpoints = {
    agencies_100: await probe(`${base}/api/v1/agencies?limit=100&skip=0`, authHeaders),
    users_100: await probe(`${base}/api/v1/users?limit=100&skip=0`, authHeaders),
    users_50: await probe(`${base}/api/v1/users?limit=50&skip=0`, authHeaders),
    users_noparams: await probe(`${base}/api/v1/users`, authHeaders),
    users_type: await probe(`${base}/api/v1/users?limit=50&type=SALARIE`, authHeaders),
    cases_dates: await probe(
      `${base}/api/v1/cases?limit=100&skip=0&active=true&createdAtStart=${encodeURIComponent(from)}&createdAtEnd=${encodeURIComponent(to)}`,
      authHeaders,
    ),
    cases_min: await probe(`${base}/api/v1/cases?limit=50`, authHeaders),
  };

  return NextResponse.json({
    tokenLength: token.length,
    authScheme: { header: working.header, prefix: working.prefix },
    endpoints,
  });
}
