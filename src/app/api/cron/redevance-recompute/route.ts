import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";

export const dynamic = "force-dynamic";

// Recalcul des redevances logicielles (implémentation détaillée au lot 6).
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({
    ok: true,
    task: "redevance-recompute",
    ranAt: new Date().toISOString(),
  });
}
