"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApporteursImportReport } from "@/lib/import/apporteurs-ingest";
import { runApporteursImport } from "../actions";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reprise du classeur « Suivi facturation apporteurs » : analyse préalable
 * (sans écriture) puis intégration. La reprise est idempotente — relancer
 * l'import ne duplique pas les lignes déjà présentes.
 */
export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ApporteursImportReport | null>(null);
  const [replace, setReplace] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (commit: boolean) => {
    if (!file) return;
    if (commit && replace) {
      const confirmed = window.confirm(
        "Mode remplacement : tous les apporteurs, conventions et versements existants seront " +
          "supprimés avant l'intégration du classeur. Confirmer ?",
      );
      if (!confirmed) return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("commit", commit ? "1" : "0");
    formData.append("replace", replace ? "1" : "0");
    startTransition(async () => {
      const result = await runApporteursImport(formData);
      setReport(result);
      if (result.committed) router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[780px] max-w-[96vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer le classeur de suivi</DialogTitle>
          <DialogDescription>
            Feuilles reconnues : « LISTE DES CONVENTIONS » et « Suivi apporteurs 20XX » (toutes
            années). Les feuilles de coordonnées bancaires sont ignorées : aucun RIB n&apos;est
            repris.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-[12.5px] transition-colors hover:bg-brand-card-soft">
            <FileSpreadsheet className="size-6 text-text-soft" />
            <span>
              {file ? (
                <span className="font-semibold">{file.name}</span>
              ) : (
                "Choisir un classeur .xlsx…"
              )}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setReport(null);
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="size-4 accent-primary"
            />
            Mode remplacement (purge préalable du module)
          </label>

          <div className="flex gap-2">
            <Button variant="outline" disabled={!file || pending} onClick={() => submit(false)}>
              {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Analyser
            </Button>
            <Button disabled={!file || pending} onClick={() => submit(true)}>
              <Upload className="mr-1.5 size-4" /> Intégrer
            </Button>
          </div>

          {report ? (
            <div className="space-y-3 rounded-lg border border-border p-3 text-[12.5px]">
              {report.ok ? (
                <div className="flex items-center gap-2 font-semibold">
                  {report.committed ? (
                    <CheckCircle2 className="size-4 text-state-success" />
                  ) : (
                    <AlertTriangle className="size-4 text-state-warning" />
                  )}
                  {report.committed ? "Import réalisé" : "Analyse (aucune écriture)"}
                </div>
              ) : (
                <p className="font-semibold text-state-danger">{report.error}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{report.conventionRows} conventions lues</Badge>
                <Badge variant="neutral">{report.versementRows} versements lus</Badge>
                {report.committed ? (
                  <>
                    <Badge variant="success">{report.apporteursCreated} apporteurs créés</Badge>
                    <Badge variant="default">{report.apporteursUpdated} complétés</Badge>
                    <Badge variant="success">{report.conventionsCreated} conventions créées</Badge>
                    <Badge variant="success">{report.versementsCreated} versements créés</Badge>
                    <Badge variant="warning">{report.versementsSkipped} déjà présents</Badge>
                  </>
                ) : null}
                {report.errors > 0 ? (
                  <Badge variant="danger">{report.errors} erreurs</Badge>
                ) : null}
                {report.warnings > 0 ? (
                  <Badge variant="warning">{report.warnings} avertissements</Badge>
                ) : null}
              </div>

              {report.sheets.length > 0 ? (
                <ul className="text-text-soft">
                  {report.sheets.map((s) => (
                    <li key={s.name}>
                      {s.name} — {s.kind === "conventions" ? "conventions" : "versements"} ({s.rows}{" "}
                      lignes)
                    </li>
                  ))}
                  {report.ignoredSheets.length > 0 ? (
                    <li className="mt-1 text-text-faint">
                      Ignorées : {report.ignoredSheets.join(", ")}
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {report.issues.length > 0 ? (
                <details>
                  <summary className="cursor-pointer font-semibold">
                    Anomalies détectées ({report.issues.length} affichées)
                  </summary>
                  <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                    {report.issues.map((issue, index) => (
                      <li key={`${issue.label}-${index}`}>
                        <span
                          className={
                            issue.level === "error"
                              ? "font-semibold text-state-danger"
                              : "text-state-warning"
                          }
                        >
                          {issue.level === "error" ? "Erreur" : "Attention"}
                        </span>{" "}
                        — {issue.label} : {issue.message}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
