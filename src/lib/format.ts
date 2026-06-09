/** Formatage FR partagé (dates, montants, initiales). */

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatEur(n: number): string {
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
  );
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? " ")[0] ?? ""}${(last ?? " ")[0] ?? ""}`.toUpperCase();
}

/** Mois écoulés depuis une date (pour l'âge du parc informatique). */
export function monthsSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}
