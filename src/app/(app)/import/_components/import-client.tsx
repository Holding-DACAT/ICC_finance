"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";

import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { runImport } from "../actions";
import type { ImportReport, ImportRowStatus } from "../types";

const STATUS_META: Record<
  ImportRowStatus,
  { label: string; variant: "success" | "default" | "warning" | "danger" }
> = {
  create: { label: "Création", variant: "success" },
  update: { label: "Mise à jour", variant: "default" },
  skip: { label: "Ignorée", variant: "warning" },
  error: { label: "Erreur", variant: "danger" },
};

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = (f: File | null) => {
    setFile(f);
    setReport(null);
  };

  const submit = (commit: boolean) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("commit", commit ? "1" : "0");
    startTransition(async () => {
      const result = await runImport(formData);
      setReport(result);
    });
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const importableCount = report ? report.created + report.updated : 0;
  const analyzed = report?.ok && !report.committed;

  return (
    <div className="space-y-5">
      <Section title="Fichier à intégrer" icon={Upload}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0] ?? null;
            if (f) selectFile(f);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          )}
        >
          <FileSpreadsheet className="size-9 text-text-soft" />
          {file ? (
            <div className="flex items-center gap-2 text-sm font-semibold">
              {file.name}
              <button
                type="button"
                aria-label="Retirer le fichier"
                onClick={reset}
                className="grid size-6 place-items-center rounded-md text-text-soft hover:bg-black/5"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-soft">
              Glissez-déposez le fichier ici, ou
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Choisir un fichier
          </Button>
          <p className="text-[11.5px] text-text-faint">
            Formats acceptés : .xlsx, .xls, .csv — feuille « Liste réseau ». 8 Mo max.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => submit(false)} disabled={!file || pending}>
            {pending && !report ? <Loader2 className="size-4 animate-spin" /> : null}
            Analyser le fichier
          </Button>
          {analyzed && importableCount > 0 ? (
            <Button
              type="button"
              variant="default"
              className="bg-state-success hover:bg-state-success/90"
              onClick={() => submit(true)}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Intégrer {importableCount} membre(s) en base
            </Button>
          ) : null}
          {report ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
              Réinitialiser
            </Button>
          ) : null}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-text-faint">
          <ShieldAlert className="mt-px size-3.5 shrink-0" />
          Pour des raisons de sécurité et de RGPD, les colonnes de mots de passe (Orias, Afib,
          Votrasso) ne sont jamais importées ni stockées.
        </p>
      </Section>

      {report?.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-state-danger/30 bg-state-danger/5 p-4 text-sm font-semibold text-state-danger">
          <AlertTriangle className="mt-px size-4 shrink-0" /> {report.error}
        </div>
      ) : null}

      {report?.committed ? (
        <div className="flex items-start gap-2 rounded-xl border border-state-success/30 bg-state-success/5 p-4 text-sm font-semibold text-state-success">
          <CheckCircle2 className="mt-px size-4 shrink-0" />
          Intégration terminée : {report.created} création(s), {report.updated} mise(s) à jour
          {report.agenciesCreated > 0 ? `, ${report.agenciesCreated} agence(s) créée(s)` : ""}.
        </div>
      ) : null}

      {report?.ok ? (
        <Section
          title={
            report.committed
              ? "Résultat de l'intégration"
              : `Aperçu de l'analyse — ${report.fileName}`
          }
          icon={FileSpreadsheet}
        >
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Lignes" value={report.totalRows} />
            <Stat label="Créations" value={report.created} tone="success" />
            <Stat label="Mises à jour" value={report.updated} tone="info" />
            <Stat label="Ignorées" value={report.skipped} tone="warning" />
            <Stat label="Erreurs" value={report.errors} tone="danger" />
            <Stat label="Agences créées" value={report.agenciesCreated} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-text-soft">
                  <th className="px-3 py-2 font-bold">Ligne</th>
                  <th className="px-3 py-2 font-bold">Membre</th>
                  <th className="px-3 py-2 font-bold">Agence</th>
                  <th className="px-3 py-2 font-bold">Statut</th>
                  <th className="px-3 py-2 font-bold">Détails</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  return (
                    <tr key={row.rowNumber} className="border-t border-border/70">
                      <td className="px-3 py-2 text-text-soft">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold">
                          {row.lastName} {row.firstName}
                        </div>
                        <div className="text-[11.5px] text-text-soft">{row.email}</div>
                      </td>
                      <td className="px-3 py-2 text-text-soft">{row.agencyName || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-text-soft">
                        {row.messages.length > 0 ? row.messages.join(" ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!report.committed && importableCount === 0 ? (
            <p className="mt-4 text-sm font-semibold text-state-warning">
              Aucune ligne valide à importer : corrigez les erreurs du fichier puis relancez
              l&apos;analyse.
            </p>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "info" | "warning" | "danger";
}) {
  const toneClass: Record<string, string> = {
    neutral: "text-foreground",
    success: "text-state-success",
    info: "text-primary",
    warning: "text-state-warning",
    danger: "text-state-danger",
  };
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className={cn("text-2xl font-extrabold tabular-nums", toneClass[tone])}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-text-soft">{label}</div>
    </div>
  );
}
