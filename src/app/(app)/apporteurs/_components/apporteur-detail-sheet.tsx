"use client";

import { useMemo, useState } from "react";
import { Building2, FileText, Pencil, Plus, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConventionStatusBadge, VersementStatusBadge } from "@/components/status-badges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMonth } from "@/lib/apporteur";
import { formatDate, formatEur } from "@/lib/format";
import type { ApporteurDTO, ConventionDTO, VersementDTO } from "../types";

interface ApporteurDetailSheetProps {
  apporteur: ApporteurDTO | null;
  /** Versements de l'apporteur (exercice affiché). */
  versements: VersementDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onEdit: (apporteur: ApporteurDTO) => void;
  onAddConvention: (apporteur: ApporteurDTO) => void;
  onEditConvention: (apporteur: ApporteurDTO, convention: ConventionDTO) => void;
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 text-[12.5px] last:border-0">
      <span className="text-text-soft">{label}</span>
      <span className="text-right font-semibold">{value ?? "—"}</span>
    </div>
  );
}

/** Fiche apporteur 360° : identité, conventions et historique des versements. */
export function ApporteurDetailSheet({
  apporteur,
  versements,
  open,
  onOpenChange,
  canEdit,
  onEdit,
  onAddConvention,
  onEditConvention,
}: ApporteurDetailSheetProps) {
  const [tab, setTab] = useState("identite");

  const rows = useMemo(
    () => versements.filter((v) => v.apporteurId === apporteur?.id),
    [versements, apporteur?.id],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[860px] max-w-[96vw]">
        {apporteur ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3 pr-16">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary">
                  <Building2 className="size-5 text-white" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{apporteur.name}</SheetTitle>
                  <div className="truncate text-xs text-text-soft">
                    {apporteur.enseigne ?? "Sans enseigne"} · SIREN {apporteur.siren ?? "—"}
                  </div>
                </div>
                <Badge variant={apporteur.status === "ACTIF" ? "success" : "neutral"}>
                  {apporteur.status === "ACTIF" ? "Actif" : "Inactif"}
                </Badge>
                {canEdit ? (
                  <Button size="sm" variant="outline" onClick={() => onEdit(apporteur)}>
                    <Pencil className="mr-1.5 size-4" /> Modifier
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <Tabs value={tab} onValueChange={setTab} className="mt-4">
              <TabsList>
                <TabsTrigger value="identite">Identité</TabsTrigger>
                <TabsTrigger value="conventions">
                  Conventions ({apporteur.conventions.length})
                </TabsTrigger>
                <TabsTrigger value="versements">Versements ({rows.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="identite" className="mt-3">
                <Line label="Titulaire" value={apporteur.holderName} />
                <Line label="SIREN" value={apporteur.siren} />
                <Line label="Date du kbis" value={formatDate(apporteur.kbisDate)} />
                <Line label="E-mail" value={apporteur.email} />
                <Line label="Téléphone" value={apporteur.phone} />
                <Line
                  label="Adresse"
                  value={
                    apporteur.address
                      ? `${apporteur.address}, ${apporteur.postalCode ?? ""} ${apporteur.city ?? ""}`
                      : null
                  }
                />
                <Line label="Société de rattachement" value={apporteur.companyName} />
                <Line label="RIB reçu" value={apporteur.ribReceived ? "Oui" : "Non"} />
                <Line label="Versements enregistrés" value={apporteur.versementCount} />
                <Line
                  label="Cumul versé"
                  value={apporteur.totalPaid === null ? "—" : formatEur(apporteur.totalPaid)}
                />
                <Line label="Dernier versement" value={formatDate(apporteur.lastPaymentDate)} />
                {apporteur.notes ? (
                  <p className="mt-3 whitespace-pre-line rounded-lg bg-brand-card-soft p-3 text-[12.5px]">
                    {apporteur.notes}
                  </p>
                ) : null}
              </TabsContent>

              <TabsContent value="conventions" className="mt-3 space-y-3">
                {canEdit ? (
                  <Button size="sm" variant="outline" onClick={() => onAddConvention(apporteur)}>
                    <Plus className="mr-1.5 size-4" /> Ajouter une convention
                  </Button>
                ) : null}
                {apporteur.conventions.length === 0 ? (
                  <p className="text-[12.5px] font-semibold text-state-warning">
                    Aucune convention enregistrée : toute ristourne versée est en anomalie.
                  </p>
                ) : (
                  apporteur.conventions.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <FileText className="size-4 text-text-soft" />
                        <span className="text-[12.5px] font-bold">
                          {c.number ? `N° ${c.number}` : "Sans numéro"}
                        </span>
                        <ConventionStatusBadge status={c.signatureStatus} />
                        {canEdit ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto"
                            onClick={() => onEditConvention(apporteur, c)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      <Line label="Rétrocession" value={c.remunerationLabel} />
                      <Line label="Date de convention" value={formatDate(c.conventionDate)} />
                      <Line label="Demandée par" value={c.requestedBy} />
                      <Line label="Société détentrice" value={c.companyName} />
                      {c.endDate ? <Line label="Résiliée le" value={formatDate(c.endDate)} /> : null}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="versements" className="mt-3">
                {rows.length === 0 ? (
                  <p className="text-[12.5px] text-text-soft">
                    Aucun versement sur l&apos;exercice sélectionné.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rows.map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px]"
                      >
                        <span className="font-bold">{v.dossierLabel}</span>
                        <span className="text-text-soft">
                          {formatMonth(v.month)} {v.year} · {v.commercialName}
                        </span>
                        <VersementStatusBadge status={v.status} />
                        <span className="ml-auto font-bold">
                          {v.amount === null ? "—" : formatEur(v.amount)}
                        </span>
                        <a
                          href={`/api/apporteurs/versements/${v.id}/note`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11.5px] font-semibold transition-colors hover:bg-brand-card-soft"
                        >
                          <Receipt className="size-3.5" /> Note
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
