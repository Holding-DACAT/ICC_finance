"use client";

import { useCallback, useMemo, useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarClock, CalendarRange, Loader2, RotateCcw, User } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_REFS, PERIODS, type SelectOption } from "@/lib/pilotage";
import { MultiSelect } from "./multi-select";

interface PilotageFiltersProps {
  period: string;
  dateRef: string;
  agencyIds: string[];
  collaboratorIds: string[];
  from: string | null;
  to: string | null;
  agencies: SelectOption[];
  collaborators: SelectOption[];
  lockedAgencyId: string | null;
}

const PERSO = "perso";

/** Vue courante des filtres (valeurs affichées par les contrôles). */
interface FiltersView {
  period: string;
  dateRef: string;
  agencyIds: string[];
  collaboratorIds: string[];
  from: string | null;
  to: string | null;
}

/**
 * Traduit un patch de paramètres d'URL (`ref`, `periode`, `du`…) en patch de vue
 * pour la mise à jour optimiste des contrôles.
 */
function urlPatchToView(patch: Record<string, string | null>): Partial<FiltersView> {
  const v: Partial<FiltersView> = {};
  if ("ref" in patch) v.dateRef = patch.ref || "creation";
  if ("periode" in patch) v.period = patch.periode || "mois";
  if ("du" in patch) v.from = patch.du || null;
  if ("au" in patch) v.to = patch.au || null;
  if ("agence" in patch) v.agencyIds = patch.agence ? patch.agence.split(",").filter(Boolean) : [];
  if ("collaborateur" in patch)
    v.collaboratorIds = patch.collaborateur ? patch.collaborateur.split(",").filter(Boolean) : [];
  return v;
}

export function PilotageFilters({
  period,
  dateRef,
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

  // Vue de référence issue du serveur (source de vérité une fois la navigation
  // confirmée). La sérialisation force la resynchronisation quand les valeurs
  // — y compris les tableaux — changent réellement.
  const base = useMemo<FiltersView>(
    () => ({ period, dateRef, agencyIds, collaboratorIds, from, to }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, dateRef, from, to, agencyIds.join(","), collaboratorIds.join(",")],
  );

  // Mise à jour **optimiste** : le contrôle reflète immédiatement le choix de
  // l'utilisateur pendant que la navigation serveur (API Actelo, potentiellement
  // lente) se termine — sinon le sélecteur « repartait » sur l'ancienne valeur,
  // donnant l'impression qu'on ne pouvait pas sélectionner (ex. la signature).
  const [view, addOptimistic] = useOptimistic<FiltersView, Partial<FiltersView>>(
    base,
    (state, patch) => ({ ...state, ...patch }),
  );

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        addOptimistic(urlPatchToView(patch));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams, addOptimistic],
  );

  const isCustom = Boolean(view.from || view.to);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field icon={CalendarClock} label="Référence de date">
        <Select value={view.dateRef} onValueChange={(v) => update({ ref: v })}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_REFS.map((r) => (
              <SelectItem key={r.key} value={r.key}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field icon={CalendarRange} label="Période">
        <Select
          value={isCustom ? PERSO : view.period}
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
          value={view.from ?? ""}
          max={view.to ?? undefined}
          onChange={(e) => update({ du: e.target.value || null })}
          className="h-9 rounded-md border border-input bg-popover px-3 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
        />
      </Field>

      <Field icon={CalendarRange} label="Au">
        <input
          type="date"
          value={view.to ?? ""}
          min={view.from ?? undefined}
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
          selected={view.agencyIds}
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
          selected={view.collaboratorIds}
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
