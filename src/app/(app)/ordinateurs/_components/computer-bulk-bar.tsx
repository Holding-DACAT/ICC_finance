"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkUpdateComputers, type BulkComputerPatch } from "../actions";
import type { ComputerDTO, MemberOption } from "../types";

/** Valeur sentinelle « ne pas modifier ce champ ». */
const KEEP = "__keep";
/** Valeur « libérer le poste » (désattribution). */
const UNASSIGN = "__unassign";

export function ComputerBulkBar({
  selected,
  clearSelection,
  memberOptions,
}: {
  selected: ComputerDTO[];
  clearSelection: () => void;
  memberOptions: MemberOption[];
}) {
  const router = useRouter();
  const [license, setLicense] = useState(KEEP);
  const [assign, setAssign] = useState(KEEP);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const patch: BulkComputerPatch = {};
    if (license !== KEEP) patch.licenseTier = license as BulkComputerPatch["licenseTier"];
    if (assign !== KEEP) patch.assignedMemberId = assign === UNASSIGN ? null : assign;
    if (Object.keys(patch).length === 0) {
      setError("Choisissez au moins un champ à modifier.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await bulkUpdateComputers(
        selected.map((c) => c.id),
        patch,
      );
      if (res.ok) {
        setLicense(KEEP);
        setAssign(KEEP);
        clearSelection();
        router.refresh();
      } else {
        setError(res.error ?? "Échec de la modification groupée.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={license} onValueChange={setLicense}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="Licence…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={KEEP}>Licence… (inchangé)</SelectItem>
          <SelectItem value="SILVER">Silver</SelectItem>
          <SelectItem value="GOLD">Gold</SelectItem>
        </SelectContent>
      </Select>
      <Select value={assign} onValueChange={setAssign}>
        <SelectTrigger className="h-9 w-[190px]">
          <SelectValue placeholder="Attribution…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={KEEP}>Attribution… (inchangé)</SelectItem>
          <SelectItem value={UNASSIGN}>Libérer (aucun)</SelectItem>
          {memberOptions.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={apply} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Appliquer
      </Button>
      {error ? <span className="text-[11.5px] font-semibold text-state-danger">{error}</span> : null}
    </div>
  );
}
