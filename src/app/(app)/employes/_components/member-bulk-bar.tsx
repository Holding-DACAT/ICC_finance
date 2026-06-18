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
import { CONTRACT_LABELS, MEMBER_STATUS_LABELS } from "@/lib/labels";
import { contractTypes, memberStatuses } from "@/lib/validations/member";
import { bulkUpdateMembers, type BulkMemberPatch } from "../actions";
import type { AgencyOption, MemberDTO } from "../types";

/** Valeur sentinelle « ne pas modifier ce champ ». */
const KEEP = "__keep";

export function MemberBulkBar({
  selected,
  clearSelection,
  agencies,
}: {
  selected: MemberDTO[];
  clearSelection: () => void;
  agencies: AgencyOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(KEEP);
  const [contract, setContract] = useState(KEEP);
  const [agency, setAgency] = useState(KEEP);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const patch: BulkMemberPatch = {};
    if (status !== KEEP) patch.status = status as BulkMemberPatch["status"];
    if (contract !== KEEP) patch.contractType = contract as BulkMemberPatch["contractType"];
    if (agency !== KEEP) patch.agencyId = agency;
    if (Object.keys(patch).length === 0) {
      setError("Choisissez au moins un champ à modifier.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await bulkUpdateMembers(
        selected.map((m) => m.id),
        patch,
      );
      if (res.ok) {
        setStatus(KEEP);
        setContract(KEEP);
        setAgency(KEEP);
        clearSelection();
        router.refresh();
      } else {
        setError(res.error ?? "Échec de la modification groupée.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BulkSelect
        value={status}
        onChange={setStatus}
        placeholder="Statut…"
        options={memberStatuses.map((s) => [s, MEMBER_STATUS_LABELS[s]])}
      />
      <BulkSelect
        value={contract}
        onChange={setContract}
        placeholder="Contrat…"
        options={contractTypes.map((c) => [c, CONTRACT_LABELS[c]])}
      />
      <BulkSelect
        value={agency}
        onChange={setAgency}
        placeholder="Agence…"
        options={agencies.map((a) => [a.id, a.name])}
      />
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
