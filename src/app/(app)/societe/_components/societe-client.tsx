"use client";

import { useMemo, useState } from "react";

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
}

export function SocieteClient({ societes }: SocieteClientProps) {
  // Par défaut, à l'ouverture de la vue, on ne montre que les éléments actifs
  // (agences actives + décompte des membres actifs).
  const [statusFilter, setStatusFilter] = useState<"ACTIF" | "Tous">("ACTIF");
  const activeOnly = statusFilter === "ACTIF";

  const rows = useMemo(() => {
    if (!activeOnly) {
      return societes.map((s) => ({
        societe: s,
        agencies: s.agencies,
        membersCount: s.membersTotal,
      }));
    }
    return societes
      .map((s) => ({
        societe: s,
        agencies: s.agencies.filter((a) => a.status === "ACTIF"),
        membersCount: s.membersActiveTotal,
      }))
      .filter((r) => r.agencies.length > 0);
  }, [societes, activeOnly]);

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ societe: s, agencies, membersCount }) => (
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
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-6 text-center text-text-soft">
                Aucune société.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
