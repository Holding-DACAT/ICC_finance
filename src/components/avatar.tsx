import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AvatarProps {
  first?: string | null;
  last?: string | null;
  active?: boolean;
  /** Photo du collaborateur (URL ou data URL). À défaut : pastille d'initiales. */
  photoUrl?: string | null;
  className?: string;
}

/** Photo ou pastille d'initiales (cf. charte UI). Grisée si membre inactif. */
export function Avatar({ first, last, active = true, photoUrl, className }: AvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${first ?? ""} ${last ?? ""}`.trim() || "Photo"}
        className={cn(
          "size-9 shrink-0 rounded-[9px] object-cover",
          !active && "opacity-60 grayscale",
          className,
        )}
      />
    );
  }
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
