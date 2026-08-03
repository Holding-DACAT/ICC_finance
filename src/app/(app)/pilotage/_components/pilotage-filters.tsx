"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Building2, User, Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIODS, type SelectOption } from "@/lib/pilotage";

const ALL = "__all__";

interface PilotageFiltersProps {
  period: string;
  agencyId: string | null;
  collaboratorId: string | null;
  agencies: SelectOption[];
  collaborators: SelectOption[];
  lockedAgencyId: string | null;
}

export function PilotageFilters({
  period,
  agencyId,
  collaboratorId,
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
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field icon={CalendarRange} label="Période">
        <Select value={period} onValueChange={(v) => update({ periode: v })}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field icon={Building2} label="Agence">
        <Select
          value={agencyId ?? ALL}
          disabled={Boolean(lockedAgencyId)}
          onValueChange={(v) => update({ agence: v === ALL ? null : v, collaborateur: null })}
        >
          <SelectTrigger className="h-9 w-[210px]">
            <SelectValue placeholder="Toutes les agences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les agences</SelectItem>
            {agencies.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field icon={User} label="Collaborateur">
        <Select
          value={collaboratorId ?? ALL}
          onValueChange={(v) => update({ collaborateur: v === ALL ? null : v })}
        >
          <SelectTrigger className="h-9 w-[210px]">
            <SelectValue placeholder="Tous les collaborateurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les collaborateurs</SelectItem>
            {collaborators.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
