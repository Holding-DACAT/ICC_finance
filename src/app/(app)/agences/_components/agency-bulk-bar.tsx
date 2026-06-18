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
import { bulkUpdateAgencies, type BulkAgencyPatch } from "../actions";
import type { AgencyDTO } from "../types";

/** Valeur sentinelle « ne pas modifier ce champ ». */
const KEEP = "__keep";

const STATUS_OPTIONS: [string, string][] = [
  ["ACTIF", "Active"],
  ["INACTIF", "Inactive"],
];
const TYPE_OPTIONS: [string, string][] = [
  ["FRANCHISE", "Franchise"],
  ["FILIALE", "Filiale"],
];

export function AgencyBulkBar({
  selected,
  clearSelection,
}: {
  selected: AgencyDTO[];
  clearSelection: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(KEEP);
  const [type, setType] = useState(KEEP);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const patch: BulkAgencyPatch = {};
    if (status !== KEEP) patch.status = status as BulkAgencyPatch["status"];
    if (type !== KEEP) patch.type = type as BulkAgencyPatch["type"];
    if (Object.keys(patch).length === 0) {
      setError("Choisissez au moins un champ à modifier.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await bulkUpdateAgencies(
        selected.map((a) => a.id),
        patch,
      );
      if (res.ok) {
        setStatus(KEEP);
        setType(KEEP);
        clearSelection();
        router.refresh();
      } else {
        setError(res.error ?? "Échec de la modification groupée.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BulkSelect value={status} onChange={setStatus} placeholder="Statut…" options={STATUS_OPTIONS} />
      <BulkSelect value={type} onChange={setType} placeholder="Type…" options={TYPE_OPTIONS} />
      <Button size="sm" onClick={apply} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Appliquer
      </Button>
      {error ? <span className="text-[11.5px] font-semibold text-state-danger">{error}</span> : null}
    </div>
  );
}

function BulkSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__keep">{placeholder} (inchangé)</SelectItem>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
