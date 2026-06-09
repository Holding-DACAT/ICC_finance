import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { formatEur } from "@/lib/format";
import { getRedevanceData } from "@/lib/redevance";

export const dynamic = "force-dynamic";

/** Export CSV de la redevance par agence (tracé dans le journal d'audit, RGPD). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const { rows, totals } = await getRedevanceData();

  const header = [
    "Agence",
    "Silver",
    "Silver HT",
    "Silver TTC",
    "Gold",
    "Gold HT",
    "Gold TTC",
    "Moy/pers HT",
    "Moy/pers TTC",
    "Total HT",
    "Total TTC",
  ];

  const lines = rows.map((r) =>
    [
      r.agencyName,
      r.silver,
      formatEur(r.silverHT),
      formatEur(r.silverHT * 1.2),
      r.gold,
      formatEur(r.goldHT),
      formatEur(r.goldHT * 1.2),
      formatEur(r.avgPerPersonHT),
      formatEur(r.avgPerPersonTTC),
      formatEur(r.totalHT),
      formatEur(r.totalTTC),
    ].join(";"),
  );

  const totalLine = [
    "TOTAL",
    totals.silver,
    "",
    "",
    totals.gold,
    "",
    "",
    "",
    "",
    formatEur(totals.totalHT),
    formatEur(totals.totalTTC),
  ].join(";");

  // BOM UTF-8 pour Excel + séparateur point-virgule (locale FR).
  const csv = "﻿" + [header.join(";"), ...lines, totalLine].join("\r\n");

  await writeAudit({
    userId: session.user.id,
    action: "VIEW",
    entity: "Redevance",
    diff: { export: "csv", rows: rows.length, at: new Date().toISOString() },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="redevance-icc-${stamp}.csv"`,
    },
  });
}
