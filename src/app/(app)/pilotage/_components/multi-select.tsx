"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SelectOption } from "@/lib/pilotage";

interface MultiSelectProps {
  options: SelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  /** Libellé au singulier pour le compteur (ex. « agence »). */
  noun: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Sélecteur **multiple** (bouton + panneau à cases à cocher, avec recherche).
 * Autonome : ne dépend d'aucune primitive Radix de type Popover.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  noun,
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.id === selected[0])?.label ?? `1 ${noun}`)
        : `${selected.length} ${noun}s`;

  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-popover px-3 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          selected.length === 0 && "text-text-faint",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-1">
          {selected.length > 0 && !disabled ? (
            <X
              className="size-4 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          ) : null}
          <ChevronDown className="size-4 opacity-60" />
        </span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-[260px] max-w-[80vw] rounded-md border border-border bg-popover shadow-md">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-8 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-text-faint">
            <span>{selected.length} sélectionné(s)</span>
            {selected.length > 0 ? (
              <button type="button" className="hover:text-white" onClick={() => onChange([])}>
                Tout effacer
              </button>
            ) : null}
          </div>
          <ul className="max-h-64 overflow-y-auto p-1">
            {filtered.map((o) => {
              const active = selectedSet.has(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-[3px] border",
                        active ? "border-primary bg-primary text-white" : "border-input",
                      )}
                    >
                      {active ? <Check className="size-3" /> : null}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-center text-[12px] text-text-faint">Aucun résultat.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
