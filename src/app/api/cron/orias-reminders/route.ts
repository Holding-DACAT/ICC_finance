import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";

export const dynamic = "force-dynamic";

// Rappels de renouvellement ORIAS (implémentation détaillée au lot 6).
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ ok: true, task: "orias-reminders", ranAt: new Date().toISOString() });
}
