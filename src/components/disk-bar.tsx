import { cn } from "@/lib/utils";

/** Barre d'espace disque colorée : vert ≥70, bleu 50-69, orange 35-49, rouge <35. */
export function DiskBar({ value }: { value: number }) {
  const color =
    value >= 70
      ? "bg-state-success"
      : value >= 50
        ? "bg-kpi-blue"
        : value >= 35
          ? "bg-state-warning"
          : "bg-state-danger";
  return (
    <div className="flex items-center gap-2.5">
      <b className="min-w-[34px] text-xs">{value}%</b>
      <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-white/[0.14]">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
