"use client";

import { Building2, ExternalLink, Landmark, Pencil, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate, formatEur } from "@/lib/format";
import type { SocieteDTO } from "../data";

interface SocieteDetailSheetProps {
  societe: SocieteDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (societe: SocieteDTO) => void;
}

export function SocieteDetailSheet({
  societe,
  open,
  onOpenChange,
  onEdit,
}: SocieteDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {societe ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle>{societe.name}</SheetTitle>
                  <div className="text-xs text-text-soft">
                    {societe.legalForm ?? "—"}
                    {societe.siren ? ` · SIREN ${societe.siren}` : ""}
                  </div>
                </div>
                {onEdit ? (
                  <Button size="sm" variant="outline" onClick={() => onEdit(societe)}>
                    <Pencil className="size-3.5" /> Éditer
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <SectionTitle icon={Landmark}>Informations</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              <Info label="Statut">
                <Badge variant={societe.status === "ACTIF" ? "success" : "danger"}>
                  {societe.status === "ACTIF" ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </Info>
              <Info label="N° ORIAS" value={societe.oriasNumber ?? "—"} />
              <Info label="Adresse" value={societe.address ?? "—"} />
              <Info label="Téléphone" value={societe.phone ?? "—"} />
              <Info label="Adresse mail" value={societe.email ?? "—"} />
              <Info label="Membres" value={String(societe.membersTotal)} />
            </div>

            <SectionTitle icon={ShieldCheck}>Assurances &amp; conformité</SectionTitle>
            <div className="space-y-3">
              <ConformiteBlock title="RC Pro">
                <Info label="Assureur" value={societe.rcProInsurer ?? "—"} />
                <Info label="N° police" value={societe.rcProPolicy ?? "—"} />
                <Info label="Échéance" value={formatDate(societe.rcProExpiry)} />
              </ConformiteBlock>
              <ConformiteBlock title="Garantie financière">
                <Info
                  label="Montant"
                  value={
                    societe.guaranteeAmount != null ? formatEur(societe.guaranteeAmount) : "—"
                  }
                />
                <Info label="Échéance" value={formatDate(societe.guaranteeExpiry)} />
              </ConformiteBlock>
            </div>

            <SectionTitle icon={Users}>Direction</SectionTitle>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {societe.directors.length ? (
                societe.directors.map((d) => (
                  <span key={d.id} className="rounded-md bg-brand-card-soft px-2 py-1 text-xs">
                    {d.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-soft">Aucun directeur renseigné.</span>
              )}
            </div>

            <SectionTitle icon={Building2}>Agences rattachées</SectionTitle>
            <div className="space-y-1.5">
              {societe.agencies.length ? (
                societe.agencies.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm"
                  >
                    <span>
                      {a.name}{" "}
                      <span className="text-text-soft">
                        ({a.type === "FRANCHISE" ? "Franchise" : "Filiale"})
                      </span>
                    </span>
                    <Badge variant="neutral">{a.membersCount} membre(s)</Badge>
                  </div>
                ))
              ) : (
                <span className="text-sm text-text-soft">Aucune agence rattachée.</span>
              )}
            </div>

            {societe.sharePointUrl ? (
              <a
                href={societe.sharePointUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ExternalLink className="size-4" /> Ouvrir le SharePoint
              </a>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-primary">
      <Icon className="size-3.5" /> {children}
    </div>
  );
}

function ConformiteBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

function Info({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-card px-3 py-2.5">
      <div className="text-[11px] text-text-soft">{label}</div>
      <div className="mt-0.5 font-semibold">{children ?? value}</div>
    </div>
  );
}
