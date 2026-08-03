"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { formatEur } from "@/lib/format";
import type { LeaderRow } from "@/lib/pilotage";

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  const columns = useMemo<ColumnDef<LeaderRow>[]>(
    () => [
      {
        id: "rang",
        header: "#",
        enableSorting: false,
        meta: { className: "w-8 text-text-faint" },
        cell: ({ row }) => <span className="tabular-nums">{row.index + 1}</span>,
      },
      {
        id: "name",
        header: "Collaborateur",
        accessorFn: (r) => r.name,
        cell: ({ row }) => (
          <div>
            <div className="font-bold">{row.original.name}</div>
            <div className="text-[11px] text-text-faint">{row.original.agencyName}</div>
          </div>
        ),
      },
      {
        id: "dossiers",
        header: "Dossiers",
        accessorFn: (r) => r.dossiers,
        meta: { className: "text-right tabular-nums" },
        cell: ({ getValue }) => <span className="font-semibold">{getValue<number>()}</span>,
      },
      {
        id: "finances",
        header: "Financés",
        accessorFn: (r) => r.finances,
        meta: { className: "text-right tabular-nums" },
        cell: ({ getValue }) => getValue<number>(),
      },
      {
        id: "taux",
        header: "Transfo.",
        accessorFn: (r) => r.taux,
        meta: { className: "text-right tabular-nums" },
        cell: ({ getValue }) => `${Math.round(getValue<number>() * 100)} %`,
      },
      {
        id: "volume",
        header: "Volume financé",
        accessorFn: (r) => r.volume,
        meta: { className: "text-right tabular-nums whitespace-nowrap" },
        cell: ({ getValue }) => formatEur(getValue<number>()),
      },
      {
        id: "ca",
        header: "CA / commissions",
        accessorFn: (r) => r.ca,
        meta: { className: "text-right tabular-nums whitespace-nowrap bg-[hsl(var(--kpi-orange)/0.12)]" },
        cell: ({ getValue }) => <span className="font-bold">{formatEur(getValue<number>())}</span>,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Recherche : collaborateur…"
      emptyMessage="Aucun collaborateur sur la période."
      footerLabel={(n) => `${n} collaborateur(s) actif(s) sur la période`}
    />
  );
}
