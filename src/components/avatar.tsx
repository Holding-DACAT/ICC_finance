import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AvatarProps {
  first?: string | null;
  last?: string | null;
  active?: boolean;
  className?: string;
}

/** Pastille d'initiales (cf. charte UI). Grisée si membre inactif. */
export function Avatar({ first, last, active = true, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[9px] text-xs font-bold text-white",
        active ? "bg-brand-card-soft" : "bg-[#5b6190]",
        className,
      )}
    >
      {initials(first, last)}
    </div>
  );
}
