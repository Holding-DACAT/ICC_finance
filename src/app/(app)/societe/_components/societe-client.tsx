"use client";

import { useMemo, useState } from "react";

import { ActiveToggleButton } from "@/components/active-toggle-button";
import { Badge } from "@/components/ui/badge";
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
import type { SocieteDTO } from "../data";

interface SocieteClientProps {
  societes: SocieteDTO[];
  canWrite: boolean;
}

export function SocieteClient({ societes, canWrite }: SocieteClientProps) {
  // Par défaut, à l'ouverture de la vue, on ne montre que les sociétés actives
  // (au moins une agence active) avec le décompte des membres actifs.
  const [statusFilter, setStatusFilter] = useState<"ACTIF" | "Tous">("ACTIF");
  const activeOnly = statusFilter === "ACTIF";

  const rows = useMemo(() => {
    return societes
      .map((s) => {
        const active = s.agencies.some((a) => a.status === "ACTIF");
        const agencies = activeOnly ? s.agencies.filter((a) => a.status === "ACTIF") : s.agencies;
        const membersCount = activeOnly ? s.membersActiveTotal : s.membersTotal;
        return { societe: s, active, agencies, membersCount };
      })
      .filter((r) => !activeOnly || r.active);
  }, [societes, activeOnly]);

  const colSpan = canWrite ? 8 : 7;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ACTIF" | "Tous")}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIF">Actifs uniquement</SelectItem>
            <SelectItem value="Tous">Tous</SelectItem>
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
            <TableRow key={s.key}>
              <TableCell className="font-bold">{s.legalName}</TableCell>
              <TableCell className="text-text-soft">{s.legalForm ?? "—"}</TableCell>
              <TableCell className="text-text-soft">{s.siren ?? "—"}</TableCell>
              <TableCell className="text-text-soft">
                <div>{s.phone ?? "—"}</div>
                <div className="text-[11px] text-text-faint">{s.email ?? "—"}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {agencies.map((a) => (
                    <span
                      key={a.id}
                      className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]"
                    >
                      {a.name}
                      <span className="ml-1 text-text-faint">
                        {a.type === "FRANCHISE" ? "F" : "Fil."}
                      </span>
                    </span>
                  ))}
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
                  <ActiveToggleButton
                    agencyIds={s.agencies.map((a) => a.id)}
                    active={active}
                    scopeLabel={`la société « ${s.legalName} »`}
                    memberCount={s.membersTotal}
                    agencyCount={s.agencies.length}
                  />
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
    </div>
  );
}
