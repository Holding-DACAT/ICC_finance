"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import type { RecruitmentBucket } from "@/lib/dashboard";

export function RecruitmentChart({ data }: { data: RecruitmentBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--text-soft))", fontSize: 11 }}
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
          formatter={(value: number) => [`${value} recrutement(s)`, ""]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
          {data.map((_, i) => (
            <Cell key={i} fill="hsl(var(--kpi-pink))" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
