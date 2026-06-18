"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { DiskBar } from "@/components/disk-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPUTER_STATUS_LABEL } from "@/lib/computer";
import { formatDate } from "@/lib/format";
import { ComputerBulkBar } from "./computer-bulk-bar";
import { ComputerFormDialog } from "./computer-form-dialog";
import type { AgencyOption, ComputerDTO, MemberOption } from "../types";

interface OrdinateursClientProps {
  computers: ComputerDTO[];
  memberOptions: MemberOption[];
  agencyOptions: AgencyOption[];
  canWrite: boolean;
}

export function OrdinateursClient({
  computers,
  memberOptions,
  agencyOptions,
  canWrite,
}: OrdinateursClientProps) {
  const [stateFilter, setStateFilter] = useState("Tous");
  const [agencyFilter, setAgencyFilter] = useState("Tous");
  const [assignFilter, setAssignFilter] = useState("Tous");
  const [formComputer, setFormComputer] = useState<ComputerDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const agencyNameById = useMemo(
    () => new Map(agencyOptions.map((a) => [a.id, a.name])),
    [agencyOptions],
  );

  const filtered = useMemo(
    () =>
      computers.filter((c) => {
        const okState =
          stateFilter === "Tous" ||
          (stateFilter === "A_RENOUVELER"
            ? c.status === "A_RENOUVELER" || c.status === "EXPIRE"
            : c.status === stateFilter);
        const okAgency =
          agencyFilter === "Tous" || c.agencyName === agencyNameById.get(agencyFilter);
        const okAssign =
          assignFilter === "Tous" ||
          (assignFilter === "assigned" ? Boolean(c.assignedMemberId) : !c.assignedMemberId);
        return okState && okAgency && okAssign;
      }),
    [computers, stateFilter, agencyFilter, assignFilter, agencyNameById],
  );

  const columns = useMemo<ColumnDef<ComputerDTO>[]>(
    () => [
      {
        id: "nom",
        header: "Nom",
        accessorFn: (c) => `${c.name} ${c.serialNumber} ${c.assignedMemberName ?? ""}`,
        cell: ({ row }) => <span className="font-bold">{row.original.name}</span>,
      },
      {
        id: "modele",
        header: "Modèle",
        accessorFn: (c) => c.model,
        cell: ({ row }) => (
          <div className="text-text-soft">
            {row.original.model}
            <div className="text-[11px] text-text-faint">{row.original.serialNumber}</div>
          </div>
        ),
      },
      {
        id: "enr",
        header: "Enreg.",
        accessorFn: (c) => c.registrationDate,
        cell: ({ getValue }) => (
          <span className="text-text-soft">{formatDate(getValue<string>())}</span>
        ),
      },
      {
        id: "sync",
        header: "Synchro",
        accessorFn: (c) => c.lastSyncDate ?? "",
        cell: ({ row }) => (
          <span className="text-text-soft">{formatDate(row.original.lastSyncDate)}</span>
        ),
      },
      {
        id: "disque",
        header: "Disque libre",
        accessorFn: (c) => c.diskFreePct,
        cell: ({ row }) => <DiskBar value={row.original.diskFreePct} />,
      },
      {
        id: "statut",
        header: "Statut",
        accessorFn: (c) => c.status,
        cell: ({ row }) => {
          const s = row.original.status;
          const variant = s === "EXPIRE" ? "danger" : s === "A_RENOUVELER" ? "warning" : "success";
          return <Badge variant={variant}>{COMPUTER_STATUS_LABEL[s]}</Badge>;
        },
      },
      {
        id: "user",
        header: "Utilisateur",
        accessorFn: (c) => c.assignedMemberName ?? "",
        cell: ({ row }) =>
          row.original.assignedMemberName ? (
            <span className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]">
              {row.original.assignedMemberName}
            </span>
          ) : (
            <span className="text-text-faint">Libre</span>
          ),
      },
      {
        id: "actions",
        header: "Éd.",
        enableSorting: false,
        meta: { className: "text-center" },
        cell: ({ row }) =>
          canWrite ? (
            <button
              type="button"
              title="Éditer"
              aria-label="Éditer"
              onClick={() => {
                setFormComputer(row.original);
                setFormOpen(true);
              }}
              className="grid size-8 place-items-center rounded-md text-text-soft transition-colors hover:bg-white/10 hover:text-white"
            >
              <Pencil className="size-4" />
            </button>
          ) : null,
      },
    ],
    [canWrite],
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--kpi-orange))] to-[hsl(28_78%_45%)] px-5 py-3 text-white">
        <div className="text-sm font-bold">Ordinateurs</div>
        {canWrite ? (
          <Button
            size="sm"
            onClick={() => {
              setFormComputer(null);
              setFormOpen(true);
            }}
            className="border border-white/30 bg-black/20 hover:bg-black/30"
          >
            Ajouter un poste <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="p-5">
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Recherche : nom, série, utilisateur…"
          emptyMessage="Aucun poste pour ces critères."
          footerLabel={(n) => `${n} poste(s)`}
          enableSelection={canWrite}
          getRowId={(c) => c.id}
          renderBulkActions={
            canWrite
              ? (selected, clear) => (
                  <ComputerBulkBar
                    selected={selected}
                    clearSelection={clear}
                    memberOptions={memberOptions}
                  />
                )
              : undefined
          }
          toolbarExtra={
            <div className="flex flex-wrap gap-2">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous états</SelectItem>
                  <SelectItem value="A_RENOUVELER">À renouveler</SelectItem>
                  <SelectItem value="EXPIRE">Expiré</SelectItem>
                  <SelectItem value="ACTIF">Actif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assignFilter} onValueChange={setAssignFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous</SelectItem>
                  <SelectItem value="assigned">Attribués</SelectItem>
                  <SelectItem value="free">Libres</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Toutes agences</SelectItem>
                  {agencyOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <ComputerFormDialog
        memberOptions={memberOptions}
        computer={formComputer}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
