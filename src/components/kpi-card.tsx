import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: LucideIcon;
  /** Classe de fond de l'icône (token charte), ex. "bg-kpi-orange". */
  iconClassName: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
}

/** Carte KPI : carré d'icône coloré + libellé/valeur + sous-texte (cf. charte UI). */
export function KpiCard({ icon: Icon, iconClassName, label, value, sub }: KpiCardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.18)]",
            iconClassName,
          )}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="flex-1 text-right">
          <div className="text-[11.5px] text-text-soft">{label}</div>
          <div className="mt-0.5 text-xl font-extrabold leading-tight">{value}</div>
        </div>
      </div>
      {sub ? <div className="mt-3 text-[11.5px] text-text-faint">{sub}</div> : null}
    </Card>
  );
}
