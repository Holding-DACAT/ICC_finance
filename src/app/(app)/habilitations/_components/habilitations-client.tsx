"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, RotateCcw } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { ComplianceBadge, HabilitationBadge } from "@/components/status-badges";
import { formatDate } from "@/lib/format";
import type { HabilitationRow } from "@/lib/habilitation";
import { setHabilitationStatus } from "../actions";

interface HabilitationsClientProps {
  rows: HabilitationRow[];
  year: number;
  canEdit: boolean;
}

export function HabilitationsClient({ rows, year, canEdit }: HabilitationsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggle = (row: HabilitationRow) => {
    const next = row.habilitationStatus === "VALIDEE" ? "A_VALIDER" : "VALIDEE";
    setPendingId(row.memberId);
    startTransition(async () => {
      await setHabilitationStatus(row.memberId, next);
      setPendingId(null);
    });
  };

  const columns = useMemo<ColumnDef<HabilitationRow>[]>(() => {
    const cols: ColumnDef<HabilitationRow>[] = [
      {
        id: "membre",
        header: "Membre",
        accessorFn: (r) => r.fullName,
        cell: ({ row }) => (
          <div>
            <div className="font-bold">{row.original.fullName}</div>
            <div className="text-[11.5px] text-text-soft">{row.original.functionTitle}</div>
          </div>
        ),
      },
      {
        id: "agence",
        header: "Agence",
        accessorFn: (r) => r.agencyName,
        cell: ({ getValue }) => <span className="font-semibold">{getValue<string>()}</span>,
      },
      {
        id: "orias",
        header: "N° ORIAS",
        accessorFn: (r) => r.oriasNumber ?? "—",
        meta: { className: "whitespace-nowrap" },
      },
      {
        id: "categories",
        header: "Catégories",
        accessorFn: (r) => r.categories.join(" "),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.categories.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.categories.map((c) => (
                <Badge key={c} variant="neutral">
                  {c}
                </Badge>
              ))}
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "renouvellement",
        header: "Renouvellement",
        accessorFn: (r) => r.renewalDate ?? "",
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => formatDate(row.original.renewalDate),
      },
      {
        id: "conformite",
        header: "Conformité ORIAS",
        accessorFn: (r) => r.complianceStatus,
        cell: ({ row }) => <ComplianceBadge status={row.original.complianceStatus} />,
      },
      {
        id: "habilitation",
        header: `Habilitation ${year}`,
        accessorFn: (r) => r.habilitationStatus,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <HabilitationBadge status={row.original.habilitationStatus} />
            {row.original.habilitationValidatedAt ? (
              <span className="text-[10.5px] text-text-faint">
                le {formatDate(row.original.habilitationValidatedAt)}
              </span>
            ) : null}
          </div>
        ),
      },
    ];

    if (canEdit) {
      cols.push({
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { className: "w-px whitespace-nowrap" },
        cell: ({ row }) => {
          const validee = row.original.habilitationStatus === "VALIDEE";
          const busy = isPending && pendingId === row.original.memberId;
          return (
            <button
              type="button"
              onClick={() => toggle(row.original)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold transition-colors hover:bg-muted disabled:opacity-50"
            >
              {validee ? (
                <>
                  <RotateCcw className="size-3.5" /> Remettre à zéro
                </>
              ) : (
                <>
                  <Check className="size-3.5" /> Valider
                </>
              )}
            </button>
          );
        },
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, canEdit, isPending, pendingId]);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary to-[hsl(243_55%_50%)] px-5 py-3 text-white">
        <div className="text-sm font-bold">Habilitations des équipes</div>
        <span className="text-[12px] font-semibold opacity-90">Année {year}</span>
      </div>

      <div className="p-5">
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Recherche : membre, agence, ORIAS…"
          emptyMessage="Aucune habilitation."
          footerLabel={(n) => `${n} habilitation(s)`}
        />
      </div>
    </div>
  );
}
