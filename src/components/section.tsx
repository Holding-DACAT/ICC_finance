import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  icon: LucideIcon;
  /** Couleur du bandeau d'en-tête : orange (défaut) ou vert (onboarding). */
  accent?: "orange" | "green";
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Conteneur de section avec bandeau d'en-tête coloré (cf. charte UI). */
export function Section({
  title,
  icon: Icon,
  accent = "orange",
  action,
  children,
  className,
}: SectionProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card shadow-[0_6px_18px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3 text-white",
          accent === "orange"
            ? "bg-gradient-to-r from-[hsl(var(--kpi-orange))] to-[hsl(28_78%_45%)]"
            : "bg-gradient-to-r from-[hsl(var(--kpi-green))] to-[hsl(137_50%_38%)]",
        )}
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Icon className="size-[17px]" /> {title}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
