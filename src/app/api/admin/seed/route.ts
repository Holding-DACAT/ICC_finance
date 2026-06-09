import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lance le seed SANS terminal (utile sur Vercel).
 * Protégé par CRON_SECRET (cf. CLAUDE.md §2/§4) :
 *   - en-tête `Authorization: Bearer <CRON_SECRET>`, ou
 *   - paramètre `?secret=<CRON_SECRET>`.
 *
 * Exemple :
 *   curl -X POST https://APP/api/admin/seed -H "Authorization: Bearer $CRON_SECRET"
 */
async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré côté serveur." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const header = request.headers.get("authorization");
  const provided = header?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const summary = await seedDatabase(prisma);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Seed échoué :", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

// GET autorisé pour faciliter le déclenchement manuel (toujours protégé par le secret).
export async function GET(request: Request) {
  return handle(request);
}
