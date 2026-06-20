import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { resetHabilitations } from "@/lib/habilitation";

export const dynamic = "force-dynamic";

/**
 * Remet à zéro le statut d'habilitation de toutes les équipes (passage à
 * « À valider »). Planifié chaque 1er janvier (cf. vercel.json) : chaque
 * habilitation doit être (re)validée pour la nouvelle année.
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const reset = await resetHabilitations();
    return NextResponse.json({
      ok: true,
      task: "habilitation-reset",
      reset,
      year: new Date().getFullYear(),
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 },
    );
  }
}
