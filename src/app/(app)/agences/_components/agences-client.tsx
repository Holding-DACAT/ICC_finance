"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Folder, Pencil, Plus } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgencyBulkBar } from "./agency-bulk-bar";
import { AgencyDetailSheet } from "./agency-detail-sheet";
import { AgencyFormDialog } from "./agency-form-dialog";
import type { AgencyDTO, MemberOption } from "../types";

interface AgencesClientProps {
  agencies: AgencyDTO[];
  memberOptions: MemberOption[];
  canWrite: boolean;
}

export function AgencesClient({ agencies, memberOptions, canWrite }: AgencesClientProps) {
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [detail, setDetail] = useState<AgencyDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formAgency, setFormAgency] = useState<AgencyDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(
    () => agencies.filter((a) => typeFilter === "Tous" || a.type === typeFilter),
    [agencies, typeFilter],
  );

  const openEdit = (a: AgencyDTO) => {
    setFormAgency(a);
    setFormOpen(true);
  };
  const openCreate = () => {
    setFormAgency(null);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<AgencyDTO>[]>(
    () => [
      {
        id: "agence",
        header: "Agence",
        accessorFn: (a) => `${a.name} ${a.legalName ?? ""} ${a.directors.map((d) => d.name).join(" ")}`,
        cell: ({ row }) => <span className="font-bold">{row.original.name}</span>,
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (a) => a.type,
        cell: ({ row }) => (
          <span className="text-text-soft">
            {row.original.type === "FRANCHISE" ? "Franchise" : "Filiale"}
          </span>
        ),
      },
      {
        id: "statut",
        header: "Statut",
        accessorFn: (a) => a.status,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIF" ? "success" : "danger"}>
            {row.original.status === "ACTIF" ? "ACTIVE" : "INACTIVE"}
          </Badge>
        ),
      },
      {
        id: "directeurs",
        header: "Directeur(s)",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.directors.length ? (
              row.original.directors.map((d) => (
                <span key={d.id} className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]">
                  {d.name}
                </span>
              ))
            ) : (
              <span className="text-text-soft">—</span>
            )}
          </div>
        ),
      },
      {
        id: "raison",
        header: "Raison sociale — statut juridique",
        accessorFn: (a) => `${a.legalName ?? ""} ${a.legalForm ?? ""}`,
        cell: ({ row }) => (
          <span className="text-text-soft">
            {row.original.legalName ? (
              <strong className="text-foreground">{row.original.legalName}</strong>
            ) : (
              "—"
            )}
            {row.original.legalForm ? ` — ${row.original.legalForm}` : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { className: "text-center" },
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canWrite ? (
              <IconAction title="Éditer" onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
              </IconAction>
            ) : null}
            <IconAction title="SharePoint" onClick={() => {}}>
              <Folder className="size-4" />
            </IconAction>
          </div>
        ),
      },
    ],
    [canWrite],
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--kpi-orange))] to-[hsl(28_78%_45%)] px-5 py-3 text-white">
        <div className="text-sm font-bold">Agences</div>
        {canWrite ? (
          <Button size="sm" onClick={openCreate} className="border border-white/30 bg-black/20 hover:bg-black/30">
            Créer une agence <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="p-5">
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Recherche : nom, raison sociale, directeur…"
          onRowClick={(a) => {
            setDetail(a);
            setDetailOpen(true);
          }}
          emptyMessage="Aucune agence pour ces critères."
          footerLabel={(n) => `${n} agence(s)`}
          enableSelection={canWrite}
          getRowId={(a) => a.id}
          renderBulkActions={
            canWrite
              ? (selected, clear) => <AgencyBulkBar selected={selected} clearSelection={clear} />
              : undefined
          }
          toolbarExtra={
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous types</SelectItem>
                <SelectItem value="FRANCHISE">Franchise</SelectItem>
                <SelectItem value="FILIALE">Filiale</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>

      <AgencyDetailSheet
        agency={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={
          canWrite
            ? (a) => {
                setDetailOpen(false);
                openEdit(a);
              }
            : undefined
        }
      />
      <AgencyFormDialog
        memberOptions={memberOptions}
        agency={formAgency}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}

function IconAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-text-soft transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
