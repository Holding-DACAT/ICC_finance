import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { computeComplianceStatus } from "@/lib/compliance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Recalcule le statut de conformité ORIAS de chaque membre selon sa date de
 * renouvellement, et renvoie la liste des immatriculations en alerte (rappels).
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const registrations = await prisma.oriasRegistration.findMany({
      select: { id: true, renewalDate: true, status: true },
    });

    let updated = 0;
    let alerts = 0;
    for (const r of registrations) {
      const next = computeComplianceStatus(r.renewalDate);
      if (next !== "A_JOUR") alerts++;
      if (next !== r.status) {
        await prisma.oriasRegistration.update({ where: { id: r.id }, data: { status: next } });
        updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      task: "orias-reminders",
      checked: registrations.length,
      updated,
      alerts,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 },
    );
  }
}
