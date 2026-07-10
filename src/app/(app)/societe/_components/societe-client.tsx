"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { ActiveToggleButton } from "@/components/active-toggle-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberOption, SocieteDTO } from "../data";
import { SocieteDetailSheet } from "./societe-detail-sheet";
import { SocieteFormDialog } from "./societe-form-dialog";

interface SocieteClientProps {
  societes: SocieteDTO[];
  memberOptions: MemberOption[];
  canWrite: boolean;
}

export function SocieteClient({ societes, memberOptions, canWrite }: SocieteClientProps) {
  // Par défaut, à l'ouverture de la vue, on ne montre que les sociétés actives.
  const [statusFilter, setStatusFilter] = useState<"ACTIF" | "Tous">("ACTIF");
  const activeOnly = statusFilter === "ACTIF";

  const [detail, setDetail] = useState<SocieteDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formSociete, setFormSociete] = useState<SocieteDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openCreate = () => {
    setFormSociete(null);
    setFormOpen(true);
  };
  const openEdit = (s: SocieteDTO) => {
    setFormSociete(s);
    setFormOpen(true);
  };

  const rows = useMemo(() => {
    return societes
      .map((s) => {
        const active = s.status === "ACTIF";
        const agencies = activeOnly ? s.agencies.filter((a) => a.status === "ACTIF") : s.agencies;
        const membersCount = activeOnly ? s.membersActiveTotal : s.membersTotal;
        return { societe: s, active, agencies, membersCount };
      })
      .filter((r) => !activeOnly || r.active);
  }, [societes, activeOnly]);

  const colSpan = canWrite ? 8 : 7;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {canWrite ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> Créer une société
          </Button>
        ) : (
          <span />
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ACTIF" | "Tous")}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIF">Actives uniquement</SelectItem>
            <SelectItem value="Tous">Toutes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Raison sociale</TableHead>
            <TableHead>Forme juridique</TableHead>
            <TableHead>SIREN</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Agences rattachées</TableHead>
            <TableHead>Membres</TableHead>
            <TableHead>Statut</TableHead>
            {canWrite ? <TableHead className="text-center">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ societe: s, active, agencies, membersCount }) => (
            <TableRow
              key={s.id}
              className="cursor-pointer"
              onClick={() => {
                setDetail(s);
                setDetailOpen(true);
              }}
            >
              <TableCell className="font-bold">{s.name}</TableCell>
              <TableCell className="text-text-soft">{s.legalForm ?? "—"}</TableCell>
              <TableCell className="text-text-soft">{s.siren ?? "—"}</TableCell>
              <TableCell className="text-text-soft">
                <div>{s.phone ?? "—"}</div>
                <div className="text-[11px] text-text-faint">{s.email ?? "—"}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {agencies.length ? (
                    agencies.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]"
                      >
                        {a.name}
                        <span className="ml-1 text-text-faint">
                          {a.type === "FRANCHISE" ? "F" : "Fil."}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-text-soft">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="neutral">{membersCount}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={active ? "success" : "danger"}>
                  {active ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </TableCell>
              {canWrite ? (
                <TableCell className="text-center">
                  <div
                    className="flex items-center justify-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Éditer"
                      aria-label="Éditer"
                      onClick={() => openEdit(s)}
                      className="grid size-8 place-items-center rounded-md text-text-soft transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <ActiveToggleButton
                      iconOnly
                      agencyIds={s.agencies.map((a) => a.id)}
                      active={active}
                      scopeLabel={`la société « ${s.name} »`}
                      memberCount={s.membersTotal}
                      agencyCount={s.agencies.length}
                    />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan} className="py-6 text-center text-text-soft">
                Aucune société.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <SocieteDetailSheet
        societe={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={
          canWrite
            ? (s) => {
                setDetailOpen(false);
                openEdit(s);
              }
            : undefined
        }
      />
      <SocieteFormDialog
        memberOptions={memberOptions}
        societe={formSociete}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
