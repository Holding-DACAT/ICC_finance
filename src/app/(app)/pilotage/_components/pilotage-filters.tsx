"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarRange, Loader2, RotateCcw, User } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIODS, type SelectOption } from "@/lib/pilotage";
import { MultiSelect } from "./multi-select";

interface PilotageFiltersProps {
  period: string;
  agencyIds: string[];
  collaboratorIds: string[];
  from: string | null;
  to: string | null;
  agencies: SelectOption[];
  collaborators: SelectOption[];
  lockedAgencyId: string | null;
}

const PERSO = "perso";

export function PilotageFilters({
  period,
  agencyIds,
  collaboratorIds,
  from,
  to,
  agencies,
  collaborators,
  lockedAgencyId,
}: PilotageFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  const isCustom = Boolean(from || to);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field icon={CalendarRange} label="Période">
        <Select
          value={isCustom ? PERSO : period}
          onValueChange={(v) => update({ periode: v, du: null, au: null })}
        >
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
            {isCustom ? (
              <SelectItem value={PERSO} disabled>
                Personnalisé (dates)
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </Field>

      <Field icon={CalendarRange} label="Du">
        <input
          type="date"
          value={from ?? ""}
          max={to ?? undefined}
          onChange={(e) => update({ du: e.target.value || null })}
          className="h-9 rounded-md border border-input bg-popover px-3 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
        />
      </Field>

      <Field icon={CalendarRange} label="Au">
        <input
          type="date"
          value={to ?? ""}
          min={from ?? undefined}
          onChange={(e) => update({ au: e.target.value || null })}
          className="h-9 rounded-md border border-input bg-popover px-3 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
        />
      </Field>

      {isCustom ? (
        <button
          type="button"
          onClick={() => update({ du: null, au: null })}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-[12.5px] font-semibold text-text-soft transition-colors hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="size-3.5" /> Dates
        </button>
      ) : null}

      <Field icon={Building2} label="Agences">
        <MultiSelect
          options={agencies}
          selected={agencyIds}
          disabled={Boolean(lockedAgencyId)}
          placeholder="Toutes les agences"
          noun="agence"
          onChange={(ids) => update({ agence: ids.join(","), collaborateur: null })}
          className="w-[210px]"
        />
      </Field>

      <Field icon={User} label="Collaborateurs">
        <MultiSelect
          options={collaborators}
          selected={collaboratorIds}
          placeholder="Tous les collaborateurs"
          noun="collaborateur"
          onChange={(ids) => update({ collaborateur: ids.join(",") })}
          className="w-[210px]"
        />
      </Field>

      {pending ? (
        <div className="flex h-9 items-center text-text-faint">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarRange;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
        <Icon className="size-3.5" /> {label}
      </span>
      {children}
    </label>
  );
}
