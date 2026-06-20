"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Folder, Lock, Pencil, Plus } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { DataTable } from "@/components/data-table";
import { MemberStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { CONTRACT_LABELS, MEMBER_STATUS_LABELS } from "@/lib/labels";
import { contractTypes, memberStatuses } from "@/lib/validations/member";
import { MemberBulkBar } from "./member-bulk-bar";
import { MemberDetailSheet } from "./member-detail-sheet";
import { MemberFormDialog } from "./member-form-dialog";
import type { AgencyOption, MemberDTO } from "../types";

interface EmployesClientProps {
  members: MemberDTO[];
  agencies: AgencyOption[];
  canCreate: boolean;
  canEdit: boolean;
}

/** Clé du statut « En cours d'intégration » (dérivé de l'onboarding, non stocké). */
const EN_COURS_INTEGRATION = "EN_COURS_INTEGRATION";

/**
 * Statut effectif affiché pour un membre — identique à la logique du badge
 * (cf. MemberStatusBadge) afin que le filtre Statut reste cohérent avec ce
 * qui est montré dans le tableau.
 */
function memberDisplayStatus(m: MemberDTO): string {
  if (m.onboardingStatus && m.onboardingStatus !== "TERMINE") return EN_COURS_INTEGRATION;
  return m.status;
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  [EN_COURS_INTEGRATION]: "En cours d'intégration",
  ...MEMBER_STATUS_LABELS,
};

export function EmployesClient({ members, agencies, canCreate, canEdit }: EmployesClientProps) {
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [contractFilter, setContractFilter] = useState("Tous");
  const [agencyFilter, setAgencyFilter] = useState("Tous");

  const [detailMember, setDetailMember] = useState<MemberDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formMember, setFormMember] = useState<MemberDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          (statusFilter === "Tous" || memberDisplayStatus(m) === statusFilter) &&
          (contractFilter === "Tous" || m.contractType === contractFilter) &&
          (agencyFilter === "Tous" || m.agencyId === agencyFilter),
      ),
    [members, statusFilter, contractFilter, agencyFilter],
  );

  const openEdit = (m: MemberDTO) => {
    setFormMember(m);
    setFormOpen(true);
  };
  const openCreate = () => {
    setFormMember(null);
    setFormOpen(true);
  };
  const openDetail = (m: MemberDTO) => {
    setDetailMember(m);
    setDetailOpen(true);
  };

  const columns = useMemo<ColumnDef<MemberDTO>[]>(
    () => [
      {
        id: "utilisateur",
        header: "Utilisateur",
        accessorFn: (m) => `${m.lastName} ${m.firstName} ${m.email}`,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar first={m.firstName} last={m.lastName} active={m.status === "ACTIF"} />
              <div>
                <div className="font-bold">
                  {m.lastName} {m.firstName}
                </div>
                <div className="text-[11.5px] text-text-soft">{m.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: "contrat",
        header: "Type de contrat",
        accessorFn: (m) => CONTRACT_LABELS[m.contractType],
        cell: ({ getValue }) => <span className="text-text-soft">{getValue<string>()}</span>,
      },
      {
        id: "statut",
        header: "Statut",
        accessorFn: (m) => STATUS_FILTER_LABELS[memberDisplayStatus(m)] ?? m.status,
        cell: ({ row }) => (
          <MemberStatusBadge
            status={row.original.status}
            onboardingStatus={row.original.onboardingStatus}
          />
        ),
      },
      {
        id: "fonction",
        header: "Fonction",
        accessorFn: (m) => `${m.functionTitle} ${m.functionSub ?? ""}`,
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.functionTitle}</div>
            {row.original.functionSub ? (
              <div className="text-[11.5px] text-text-soft">{row.original.functionSub}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "agence",
        header: "Agence",
        accessorFn: (m) => m.agencyName,
        cell: ({ getValue }) => <span className="text-text-soft">{getValue<string>()}</span>,
      },
      {
        id: "arrivee",
        header: "Arrivée",
        accessorFn: (m) => m.arrivalDate,
        cell: ({ getValue }) => (
          <span className="text-text-soft">{formatDate(getValue<string>())}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { className: "text-center" },
        cell: ({ row }) => (
          <div
            className="flex items-center justify-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {canEdit ? (
              <IconAction title="Éditer" onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
              </IconAction>
            ) : null}
            <IconAction title="SharePoint" onClick={() => {}}>
              <Folder className="size-4" />
            </IconAction>
            <IconAction title="Réinitialiser le mot de passe" onClick={() => {}}>
              <Lock className="size-4" />
            </IconAction>
          </div>
        ),
      },
    ],
    [canEdit],
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--kpi-orange))] to-[hsl(28_78%_45%)] px-5 py-3 text-white">
        <div className="text-sm font-bold">Utilisateurs</div>
        {canCreate ? (
          <Button
            size="sm"
            onClick={openCreate}
            className="border border-white/30 bg-black/20 hover:bg-black/30"
          >
            Créer un membre <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="p-5">
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Recherche : nom, email, fonction…"
          onRowClick={openDetail}
          emptyMessage="Aucun membre pour ces critères."
          footerLabel={(n) => `${n} membre(s)`}
          enableSelection={canEdit}
          getRowId={(m) => m.id}
          renderBulkActions={
            canEdit
              ? (selected, clear) => (
                  <MemberBulkBar
                    selected={selected}
                    clearSelection={clear}
                    agencies={agencies}
                  />
                )
              : undefined
          }
          toolbarExtra={
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  ["Tous", "Tous statuts"],
                  [EN_COURS_INTEGRATION, STATUS_FILTER_LABELS[EN_COURS_INTEGRATION]],
                  ...memberStatuses.map((s) => [s, MEMBER_STATUS_LABELS[s]] as [string, string]),
                ]}
              />
              <FilterSelect
                value={contractFilter}
                onChange={setContractFilter}
                options={[
                  ["Tous", "Tous contrats"],
                  ...contractTypes.map((c) => [c, CONTRACT_LABELS[c]] as [string, string]),
                ]}
              />
              <FilterSelect
                value={agencyFilter}
                onChange={setAgencyFilter}
                options={[
                  ["Tous", "Toutes agences"],
                  ...agencies.map((a) => [a.id, a.name] as [string, string]),
                ]}
              />
            </div>
          }
        />
      </div>

      <MemberDetailSheet
        member={detailMember}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={
          canEdit
            ? (m) => {
                setDetailOpen(false);
                openEdit(m);
              }
            : undefined
        }
      />
      <MemberFormDialog
        agencies={agencies}
        member={formMember}
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

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
