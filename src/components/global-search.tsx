"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Landmark, type LucideIcon, Monitor, Search, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SearchItem, SearchItemType } from "@/lib/search";

interface GlobalSearchProps {
  items: SearchItem[];
}

const GROUPS: { type: SearchItemType; label: string; icon: LucideIcon }[] = [
  { type: "member", label: "Équipes", icon: Users },
  { type: "societe", label: "Sociétés", icon: Landmark },
  { type: "agency", label: "Agences", icon: Building2 },
  { type: "computer", label: "Ordinateurs", icon: Monitor },
];

const MAX_PER_GROUP = 6;

export function GlobalSearch({ items }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (q.length < 1) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const matches = items.filter((it) => tokens.every((t) => it.terms.includes(t)));
    return GROUPS.map((g) => ({
      ...g,
      items: matches.filter((m) => m.type === g.type).slice(0, MAX_PER_GROUP),
    })).filter((g) => g.items.length > 0);
  }, [items, q]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

  // Ferme le panneau au clic en dehors.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const showPanel = open && q.length >= 1;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-primary/60">
        <Search className="size-4 shrink-0 text-text-soft" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Rechercher un membre, une société, une agence, un ordinateur…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          aria-label="Recherche globale"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="text-[11px] font-semibold text-text-soft hover:text-foreground"
          >
            Effacer
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute z-30 mt-2 max-h-[60vh] w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
          {total === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-text-soft">
              Aucun résultat pour «&nbsp;{query}&nbsp;».
            </div>
          ) : (
            groups.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.type} className="mb-1.5 last:mb-0">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
                    <Icon className="size-3.5" /> {g.label}
                  </div>
                  {g.items.map((it) => (
                    <Link
                      key={`${it.type}-${it.id}`}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-brand-card-soft",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{it.label}</div>
                        {it.sublabel ? (
                          <div className="truncate text-[11.5px] text-text-soft">{it.sublabel}</div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
