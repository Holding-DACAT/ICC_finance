"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { formatEur } from "@/lib/format";
import type { RedevanceParams, RedevanceRow } from "@/lib/redevance";

const COL = {
  silver: "bg-[hsl(var(--kpi-orange)/0.16)]",
  gold: "bg-[hsl(var(--kpi-pink)/0.16)]",
  moy: "bg-[hsl(var(--kpi-green)/0.15)]",
  total: "bg-[hsl(var(--kpi-blue)/0.16)]",
};

interface RedevanceClientProps {
  rows: RedevanceRow[];
  params: RedevanceParams;
}

export function RedevanceClient({ rows, params }: RedevanceClientProps) {
  const columns = useMemo<ColumnDef<RedevanceRow>[]>(
    () => [
      {
        id: "agence",
        header: "Agence",
        accessorFn: (r) => r.agencyName,
        cell: ({ row }) => <span className="font-bold">{row.original.agencyName}</span>,
      },
      eur("s-nb", "Silver", (r) => r.silver, COL.silver, true),
      eur("s-ht", "HT", (r) => r.silverHT, COL.silver),
      eur("s-ttc", "Total TTC", (r) => r.silverHT * (1 + params.tvaRate), COL.silver),
      eur("g-nb", "Gold", (r) => r.gold, COL.gold, true),
      eur("g-ht", "HT", (r) => r.goldHT, COL.gold),
      eur("g-ttc", "Total TTC", (r) => r.goldHT * (1 + params.tvaRate), COL.gold),
      eur("m-ht", "Moy/pers HT", (r) => r.avgPerPersonHT, COL.moy),
      eur("m-ttc", "Moy/pers TTC", (r) => r.avgPerPersonTTC, COL.moy),
      eur("t-ht", "Total HT", (r) => r.totalHT, COL.total),
      eur("t-ttc", "Total TTC", (r) => r.totalTTC, COL.total),
    ],
    [params.tvaRate],
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--kpi-orange))] to-[hsl(28_78%_45%)] px-5 py-3 text-white">
        <div className="text-sm font-bold">Redevance informatique</div>
        <a
          href="/api/redevance/export"
          className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-black/20 px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-black/30"
        >
          <Download className="size-4" /> Exporter (CSV)
        </a>
      </div>

      <div className="p-5">
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Recherche : agence…"
          emptyMessage="Aucune agence à facturer."
          footerLabel={(n) =>
            `${n} agence(s) — Silver ${formatEur(params.silverHT)} · Gold ${formatEur(
              params.goldHT,
            )} (HT, TVA ${Math.round(params.tvaRate * 100)} %)`
          }
        />
      </div>
    </div>
  );
}

/** Construit une colonne montant/compteur teintée. */
function eur(
  id: string,
  header: string,
  accessor: (r: RedevanceRow) => number,
  className: string,
  isCount = false,
): ColumnDef<RedevanceRow> {
  return {
    id,
    header,
    accessorFn: accessor,
    meta: { className: `${className} whitespace-nowrap text-[12.5px]` },
    cell: ({ getValue }) => {
      const v = getValue<number>();
      return isCount ? <span className="font-semibold">{v}</span> : formatEur(v);
    },
  };
}
