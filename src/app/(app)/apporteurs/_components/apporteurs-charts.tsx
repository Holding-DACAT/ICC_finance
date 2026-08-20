"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MONTH_LABELS } from "@/lib/apporteur";
import { formatEur } from "@/lib/format";
import type { VersementDTO } from "../types";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
} as const;

/**
 * Deux lectures du suivi : la saisonnalité des ristournes versées sur
 * l'exercice, et les apporteurs les plus rémunérateurs.
 */
export function ApporteursCharts({ versements }: { versements: VersementDTO[] }) {
  const monthly = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const v of versements) {
      if (v.status === "ANNULE" || v.amount === null || !v.month) continue;
      totals[v.month - 1] += v.amount;
    }
    return MONTH_LABELS.map((label, index) => ({
      label: label.slice(0, 3),
      total: Math.round(totals[index]),
    }));
  }, [versements]);

  const top = useMemo(() => {
    const byApporteur = new Map<string, number>();
    for (const v of versements) {
      if (v.status === "ANNULE" || v.amount === null) continue;
      byApporteur.set(v.apporteurName, (byApporteur.get(v.apporteurName) ?? 0) + v.amount);
    }
    return [...byApporteur.entries()]
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [versements]);

  if (versements.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-xl bg-card p-4 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        <div className="mb-2 text-[12.5px] font-bold">Ristournes par mois</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={monthly} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--text-soft))", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "hsl(var(--text-soft))" }}
              formatter={(value: number) => [formatEur(value), "Versé"]}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={38} fill="hsl(var(--kpi-orange))" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        <div className="mb-2 text-[12.5px] font-bold">Principaux apporteurs</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart
            data={top}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--text-soft))", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "hsl(var(--text-soft))" }}
              formatter={(value: number) => [formatEur(value), "Versé"]}
            />
            <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {top.map((entry) => (
                <Cell key={entry.name} fill="hsl(var(--kpi-blue))" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
