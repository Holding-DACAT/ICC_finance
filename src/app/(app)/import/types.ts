/** Types partagés entre la Server Action d'import et l'UI cliente. */

export type ImportRowStatus = "create" | "update" | "error" | "skip";

export interface ImportRowReport {
  rowNumber: number;
  agencyName: string;
  lastName: string;
  firstName: string;
  email: string;
  status: ImportRowStatus;
  /** Messages d'erreur ou d'avertissement à afficher. */
  messages: string[];
}

export interface ImportReport {
  ok: boolean;
  error?: string;
  /** true si l'import a réellement écrit en base ; false en analyse (dry-run). */
  committed: boolean;
  /** true si la base RH a été vidée avant l'intégration (mode remplacement). */
  replaced: boolean;
  fileName: string;
  sheetName: string | null;
  totalRows: number;
  created: number;
  updated: number;
  errors: number;
  skipped: number;
  agenciesCreated: number;
  rows: ImportRowReport[];
}
