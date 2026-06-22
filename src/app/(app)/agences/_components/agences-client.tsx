"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Folder, Pencil, Plus } from "lucide-react";

import { ActiveToggleButton } from "@/components/active-toggle-button";
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
  /** Id d'agence à ouvrir automatiquement (deep-link depuis la recherche). */
  initialFocusId?: string;
}

export function AgencesClient({
  agencies,
  memberOptions,
  canWrite,
  initialFocusId,
}: AgencesClientProps) {
  const [typeFilter, setTypeFilter] = useState("Tous");
  // Par défaut, à l'ouverture de la vue, on n'affiche que les agences actives.
  const [statusFilter, setStatusFilter] = useState("ACTIF");
  const [detail, setDetail] = useState<AgencyDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formAgency, setFormAgency] = useState<AgencyDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Ouvre automatiquement la fiche ciblée par la recherche globale (?focus=…).
  useEffect(() => {
    if (!initialFocusId) return;
    const a = agencies.find((x) => x.id === initialFocusId);
    if (a) {
      setDetail(a);
      setDetailOpen(true);
    }
  }, [initialFocusId, agencies]);

  const filtered = useMemo(
    () =>
      agencies.filter(
        (a) =>
          (typeFilter === "Tous" || a.type === typeFilter) &&
          (statusFilter === "Tous" || a.status === statusFilter),
      ),
    [agencies, typeFilter, statusFilter],
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
              <>
                <IconAction title="Éditer" onClick={() => openEdit(row.original)}>
                  <Pencil className="size-4" />
                </IconAction>
                <ActiveToggleButton
                  iconOnly
                  agencyIds={[row.original.id]}
                  active={row.original.status === "ACTIF"}
                  scopeLabel={`l'agence « ${row.original.name} »`}
                  memberCount={row.original.members.length}
                />
              </>
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
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous statuts</SelectItem>
                  <SelectItem value="ACTIF">Actives</SelectItem>
                  <SelectItem value="INACTIF">Inactives</SelectItem>
                </SelectContent>
              </Select>
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
            </div>
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
