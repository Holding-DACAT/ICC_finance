"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Download, Pencil, Plus, Receipt, Upload } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { ConventionStatusBadge, VersementStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMonth } from "@/lib/apporteur";
import { formatDate, formatEur } from "@/lib/format";
import { VERSEMENT_STATUS_LABELS } from "@/lib/labels";
import { versementStatuses } from "@/lib/validations/apporteur";
import { markVersementPaid } from "../actions";
import { ApporteurDetailSheet } from "./apporteur-detail-sheet";
import { ApporteurFormDialog } from "./apporteur-form-dialog";
import { ApporteursCharts } from "./apporteurs-charts";
import { ConventionFormDialog } from "./convention-form-dialog";
import { ImportDialog } from "./import-dialog";
import { VersementFormDialog } from "./versement-form-dialog";
import type {
  AgencyOption,
  ApporteurDTO,
  CompanyOption,
  ConventionDTO,
  VersementDTO,
  VersementFlag,
} from "../types";

const ALL = "__toutes__";

/** Libellés des anomalies back-office (survol des pastilles). */
const FLAG_LABELS: Record<VersementFlag, string> = {
  CONVENTION_MANQUANTE: "Aucune convention enregistrée",
  CONVENTION_NON_SIGNEE: "Convention non signée / à régulariser",
  RISTOURNE_NON_VERSEE: "Ristourne due, non versée",
  SIREN_NON_VERIFIE: "SIREN non vérifié",
  KBIS_MANQUANT: "Kbis manquant",
  ECART_CONVENTION: "Écart avec la règle de la convention",
};

interface ApporteursClientProps {
  apporteurs: ApporteurDTO[];
  versements: VersementDTO[];
  companies: CompanyOption[];
  agencies: AgencyOption[];
  years: number[];
  selectedYear: number | null;
  canEdit: boolean;
  canSeeAmounts: boolean;
}

export function ApporteursClient({
  apporteurs,
  versements,
  companies,
  agencies,
  years,
  selectedYear,
  canEdit,
  canSeeAmounts,
}: ApporteursClientProps) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [companyFilter, setCompanyFilter] = useState<string>(ALL);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  const [versementDialog, setVersementDialog] = useState<{
    open: boolean;
    versement: VersementDTO | null;
    apporteurId?: string;
  }>({ open: false, versement: null });
  const [apporteurDialog, setApporteurDialog] = useState<{
    open: boolean;
    apporteur: ApporteurDTO | null;
  }>({ open: false, apporteur: null });
  const [conventionDialog, setConventionDialog] = useState<{
    open: boolean;
    apporteur: ApporteurDTO | null;
    convention: ConventionDTO | null;
  }>({ open: false, apporteur: null, convention: null });
  const [detail, setDetail] = useState<ApporteurDTO | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filteredVersements = useMemo(
    () =>
      versements.filter((v) => {
        if (statusFilter !== ALL && v.status !== statusFilter) return false;
        if (companyFilter !== ALL && (v.companyName ?? "—") !== companyFilter) return false;
        if (anomaliesOnly && v.flags.length === 0) return false;
        return true;
      }),
    [versements, statusFilter, companyFilter, anomaliesOnly],
  );

  const companyNames = useMemo(
    () => [...new Set(versements.map((v) => v.companyName ?? "—"))].sort(),
    [versements],
  );

  const changeYear = (value: string) => {
    // « tous » = historique complet (le paramètre absent affiche l'exercice courant).
    router.push(`/apporteurs?annee=${value === ALL ? "tous" : value}`);
  };

  const versementColumns = useMemo<ColumnDef<VersementDTO>[]>(() => {
    const columns: ColumnDef<VersementDTO>[] = [
      {
        id: "apporteur",
        header: "Apporteur",
        accessorFn: (v) => v.apporteurName,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-bold">{row.original.apporteurName}</div>
            <div className="truncate text-[11px] text-text-faint">
              {row.original.companyName ?? row.original.agencyName ?? "—"}
            </div>
          </div>
        ),
      },
      {
        id: "dossier",
        header: "Dossier",
        accessorFn: (v) => v.dossierLabel,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">{row.original.dossierLabel}</div>
            <div className="text-[11px] text-text-faint">
              {formatMonth(row.original.month)} {row.original.year}
            </div>
          </div>
        ),
      },
      {
        id: "commercial",
        header: "Commercial",
        accessorFn: (v) => v.commercialName,
        meta: { className: "whitespace-nowrap text-[12.5px]" },
      },
      {
        id: "convention",
        header: "Convention",
        accessorFn: (v) => v.conventionStatus ?? "AUCUNE",
        cell: ({ row }) =>
          row.original.conventionStatus ? (
            <div className="space-y-1">
              <ConventionStatusBadge status={row.original.conventionStatus} />
              <div className="text-[11px] text-text-faint">{row.original.conventionRule}</div>
            </div>
          ) : (
            <Badge variant="danger">Absente</Badge>
          ),
      },
    ];

    if (canSeeAmounts) {
      columns.push(
        {
          id: "montant",
          header: "Versé",
          accessorFn: (v) => v.amount ?? 0,
          meta: { className: "whitespace-nowrap text-right font-bold" },
          cell: ({ row }) => (row.original.amount === null ? "—" : formatEur(row.original.amount)),
        },
        {
          id: "taux",
          header: "% CB / % CA",
          accessorFn: (v) => v.pctCommission ?? 0,
          meta: { className: "whitespace-nowrap text-[12px] text-text-soft" },
          cell: ({ row }) => (
            <>
              {pct(row.original.pctCommission)} / {pct(row.original.pctFees)}
            </>
          ),
        },
        {
          id: "ecart",
          header: "Écart",
          accessorFn: (v) => v.deltaAmount ?? 0,
          meta: { className: "whitespace-nowrap text-[12px]" },
          cell: ({ row }) => {
            const { deltaAmount, expectedAmount } = row.original;
            if (deltaAmount === null || expectedAmount === null) return "—";
            const anomaly = row.original.flags.includes("ECART_CONVENTION");
            return (
              <span
                className={anomaly ? "font-bold text-state-danger" : "text-text-soft"}
                title={`Attendu : ${formatEur(expectedAmount)}`}
              >
                {deltaAmount > 0 ? "+" : ""}
                {formatEur(deltaAmount)}
              </span>
            );
          },
        },
      );
    }

    columns.push(
      {
        id: "statut",
        header: "Statut",
        accessorFn: (v) => v.status,
        cell: ({ row }) => (
          <div className="space-y-1">
            <VersementStatusBadge status={row.original.status} />
            <div className="text-[11px] text-text-faint">
              {formatDate(row.original.paymentDate)}
            </div>
          </div>
        ),
      },
      {
        id: "anomalies",
        header: "Contrôles",
        accessorFn: (v) => v.flags.length,
        cell: ({ row }) =>
          row.original.flags.length === 0 ? (
            <span className="text-[11.5px] text-text-faint">OK</span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-state-warning"
              title={row.original.flags.map((f) => FLAG_LABELS[f]).join("\n")}
            >
              <AlertTriangle className="size-3.5" />
              {row.original.flags.length}
            </span>
          ),
      },
    );

    if (canEdit) {
      columns.push({
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Modifier le versement"
              onClick={(e) => {
                e.stopPropagation();
                setVersementDialog({ open: true, versement: row.original });
              }}
            >
              <Pencil className="size-4" />
            </Button>
            {row.original.status === "A_VERSER" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async (e) => {
                  e.stopPropagation();
                  await markVersementPaid(row.original.id);
                  router.refresh();
                }}
              >
                Pointer
              </Button>
            ) : null}
            <a
              href={`/api/apporteurs/versements/${row.original.id}/note`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Note de ristourne"
              className="grid size-8 place-items-center rounded-md border border-border transition-colors hover:bg-brand-card-soft"
            >
              <Receipt className="size-4" />
            </a>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit, canSeeAmounts, router]);

  const apporteurColumns = useMemo<ColumnDef<ApporteurDTO>[]>(
    () => [
      {
        id: "nom",
        header: "Apporteur",
        accessorFn: (a) => `${a.name} ${a.siren ?? ""} ${a.enseigne ?? ""}`,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-bold">{row.original.name}</div>
            <div className="truncate text-[11px] text-text-faint">
              {row.original.enseigne ?? "—"} · SIREN {row.original.siren ?? "—"}
            </div>
          </div>
        ),
      },
      {
        id: "convention",
        header: "Convention",
        accessorFn: (a) => a.activeConvention?.signatureStatus ?? "AUCUNE",
        cell: ({ row }) =>
          row.original.activeConvention ? (
            <div className="space-y-1">
              <ConventionStatusBadge status={row.original.activeConvention.signatureStatus} />
              <div className="text-[11px] text-text-faint">
                {row.original.activeConvention.remunerationLabel}
              </div>
            </div>
          ) : (
            <Badge variant="danger">Absente</Badge>
          ),
      },
      {
        id: "versements",
        header: "Versements",
        accessorFn: (a) => a.versementCount,
        meta: { className: "text-right" },
      },
      ...(canSeeAmounts
        ? [
            {
              id: "cumul",
              header: "Cumul versé",
              accessorFn: (a: ApporteurDTO) => a.totalPaid ?? 0,
              meta: { className: "whitespace-nowrap text-right font-bold" },
              cell: ({ row }: { row: { original: ApporteurDTO } }) =>
                row.original.totalPaid === null ? "—" : formatEur(row.original.totalPaid),
            } satisfies ColumnDef<ApporteurDTO>,
          ]
        : []),
      {
        id: "dernier",
        header: "Dernier versement",
        accessorFn: (a) => a.lastPaymentDate ?? "",
        meta: { className: "whitespace-nowrap text-[12.5px]" },
        cell: ({ row }) => formatDate(row.original.lastPaymentDate),
      },
      {
        id: "statut",
        header: "Statut",
        accessorFn: (a) => a.status,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIF" ? "success" : "neutral"}>
            {row.original.status === "ACTIF" ? "Actif" : "Inactif"}
          </Badge>
        ),
      },
    ],
    [canSeeAmounts],
  );

  const exportHref = selectedYear
    ? `/api/apporteurs/export?annee=${selectedYear}`
    : "/api/apporteurs/export";

  return (
    <>
      <Tabs defaultValue="versements" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="versements">Versements ({versements.length})</TabsTrigger>
            <TabsTrigger value="apporteurs">Apporteurs ({apporteurs.length})</TabsTrigger>
          </TabsList>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a
              href={exportHref}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12.5px] font-semibold transition-colors hover:bg-brand-card-soft"
            >
              <Download className="size-4" /> Exporter (Excel)
            </a>
            {canEdit ? (
              <>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="mr-1.5 size-4" /> Importer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setApporteurDialog({ open: true, apporteur: null })}
                >
                  <Plus className="mr-1.5 size-4" /> Apporteur
                </Button>
                <Button onClick={() => setVersementDialog({ open: true, versement: null })}>
                  <Plus className="mr-1.5 size-4" /> Versement
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <TabsContent value="versements" className="space-y-4">
          <ApporteursCharts versements={filteredVersements} />

          <div className="rounded-xl bg-card p-5 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
            <DataTable
              columns={versementColumns}
              data={filteredVersements}
              searchPlaceholder="Recherche : apporteur, dossier, commercial…"
              emptyMessage="Aucun versement sur ce périmètre."
              footerLabel={(n) => `${n} versement(s)`}
              onRowClick={(row) =>
                setDetail(apporteurs.find((a) => a.id === row.apporteurId) ?? null)
              }
              toolbarExtra={
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedYear ? String(selectedYear) : ALL}
                    onValueChange={changeYear}
                  >
                    <SelectTrigger className="h-9 w-[130px]">
                      <SelectValue placeholder="Exercice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Tous les exercices</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[130px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Tous statuts</SelectItem>
                      {versementStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {VERSEMENT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-9 w-[170px]">
                      <SelectValue placeholder="Société" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Toutes sociétés</SelectItem>
                      {companyNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-text-soft">
                    <input
                      type="checkbox"
                      checked={anomaliesOnly}
                      onChange={(e) => setAnomaliesOnly(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    Anomalies seulement
                  </label>
                </div>
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="apporteurs">
          <div className="rounded-xl bg-card p-5 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
            <DataTable
              columns={apporteurColumns}
              data={apporteurs}
              searchPlaceholder="Recherche : nom, SIREN, enseigne…"
              emptyMessage="Aucun apporteur enregistré."
              footerLabel={(n) => `${n} apporteur(s)`}
              onRowClick={(row) => setDetail(row)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ApporteurDetailSheet
        apporteur={detail}
        versements={versements}
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        canEdit={canEdit}
        onEdit={(a) => setApporteurDialog({ open: true, apporteur: a })}
        onAddConvention={(a) =>
          setConventionDialog({ open: true, apporteur: a, convention: null })
        }
        onEditConvention={(a, c) =>
          setConventionDialog({ open: true, apporteur: a, convention: c })
        }
      />

      {canEdit ? (
        <>
          <VersementFormDialog
            apporteurs={apporteurs}
            companies={companies}
            agencies={agencies}
            versement={versementDialog.versement}
            defaultApporteurId={versementDialog.apporteurId}
            open={versementDialog.open}
            onOpenChange={(open) =>
              setVersementDialog((state) => ({ ...state, open, versement: open ? state.versement : null }))
            }
          />
          <ApporteurFormDialog
            companies={companies}
            apporteur={apporteurDialog.apporteur}
            open={apporteurDialog.open}
            onOpenChange={(open) =>
              setApporteurDialog((state) => ({ ...state, open, apporteur: open ? state.apporteur : null }))
            }
          />
          {conventionDialog.apporteur ? (
            <ConventionFormDialog
              apporteurId={conventionDialog.apporteur.id}
              apporteurName={conventionDialog.apporteur.name}
              companies={companies}
              convention={conventionDialog.convention}
              open={conventionDialog.open}
              onOpenChange={(open) =>
                setConventionDialog((state) => ({ ...state, open }))
              }
            />
          ) : null}
          <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </>
      ) : null}
    </>
  );
}

/** Taux affiché en pourcentage, « — » si l'assiette est inconnue. */
function pct(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 1000) / 10} %`;
}
