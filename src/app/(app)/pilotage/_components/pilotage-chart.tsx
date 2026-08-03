"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SeriesPoint } from "@/lib/pilotage";

const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const compactEur = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)} k€` : `${Math.round(n)} €`;

export function PilotageChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--text-soft))", fontSize: 11 }}
        />
        <YAxis
          yAxisId="dossiers"
          tickLine={false}
          axisLine={false}
          width={28}
          tick={{ fill: "hsl(var(--text-soft))", fontSize: 11 }}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="ca"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: "hsl(var(--text-soft))", fontSize: 11 }}
          tickFormatter={compactEur}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--text-soft))" }}
          formatter={(value: number, name: string) =>
            name === "ca"
              ? [eur0(value), "CA / commissions"]
              : [`${value} dossier(s)`, "Dossiers créés"]
          }
        />
        <Bar
          yAxisId="dossiers"
          dataKey="dossiers"
          fill="hsl(var(--kpi-blue))"
          radius={[5, 5, 0, 0]}
          maxBarSize={38}
        />
        <Line
          yAxisId="ca"
          type="monotone"
          dataKey="ca"
          stroke="hsl(var(--kpi-orange))"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "hsl(var(--kpi-orange))" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
