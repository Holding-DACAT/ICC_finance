"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import type { RecruitmentBucket } from "@/lib/dashboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RecruitmentChart({ data }: { data: RecruitmentBucket[] }) {
  const [selected, setSelected] = useState<RecruitmentBucket | null>(null);

  const handleBarClick = (bucket: RecruitmentBucket) => {
    if (bucket.count > 0) setSelected(bucket);
  };

  return (
    <>
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
            formatter={(value: number) => [
              `${value} recrutement(s)${value > 0 ? " — cliquer pour la liste" : ""}`,
              "",
            ]}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            maxBarSize={42}
            onClick={(_, index) => handleBarClick(data[index])}
          >
            {data.map((bucket, i) => (
              <Cell
                key={i}
                fill="hsl(var(--kpi-pink))"
                cursor={bucket.count > 0 ? "pointer" : "default"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-kpi-pink" />
              Recrutements — {selected?.label}
            </DialogTitle>
            <DialogDescription>
              {selected?.count} personne(s) recrutée(s) ce mois-ci.
            </DialogDescription>
          </DialogHeader>
          <ul className="-mr-2 max-h-[50vh] divide-y divide-border overflow-y-auto pr-2">
            {selected?.members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/employes?focus=${m.id}`}
                  onClick={() => setSelected(null)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-card"
                >
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
