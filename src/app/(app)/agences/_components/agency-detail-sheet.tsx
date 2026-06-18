"use client";

import { Building2, ExternalLink, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate, formatEur } from "@/lib/format";
import type { AgencyDTO } from "../types";

interface AgencyDetailSheetProps {
  agency: AgencyDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgencyDetailSheet({ agency, open, onOpenChange }: AgencyDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {agency ? (
          <>
            <SheetHeader>
              <SheetTitle>{agency.name}</SheetTitle>
              <div className="text-xs text-text-soft">
                {agency.type === "FRANCHISE" ? "Franchise" : "Filiale"}
                {agency.legalName ? ` · ${agency.legalName}` : ""}
                {agency.legalForm ? ` — ${agency.legalForm}` : ""}
              </div>
            </SheetHeader>

            <SectionTitle icon={Building2}>Informations</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              <Info label="Statut">
                <Badge variant={agency.status === "ACTIF" ? "success" : "warning"}>
                  {agency.status === "ACTIF" ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </Info>
              <Info label="N° ORIAS" value={agency.oriasNumber ?? "—"} />
              <Info label="SIREN" value={agency.siren ?? "—"} />
              <Info label="Adresse" value={agency.address ?? "—"} />
              <Info label="Téléphone" value={agency.phone ?? "—"} />
              <Info label="Adresse mail" value={agency.email ?? "—"} />
              <Info label="Membres" value={String(agency.members.length)} />
            </div>

            <SectionTitle icon={ShieldCheck}>Assurances & conformité</SectionTitle>
            <div className="space-y-3">
              <ConformiteBlock title="RC Pro">
                <Info label="Assureur" value={agency.rcProInsurer ?? "—"} />
                <Info label="Échéance" value={formatDate(agency.rcProExpiry)} />
              </ConformiteBlock>
              <ConformiteBlock title="Garantie financière">
                <Info
                  label="Montant"
                  value={agency.guaranteeAmount != null ? formatEur(agency.guaranteeAmount) : "—"}
                />
                <Info label="Échéance" value={formatDate(agency.guaranteeExpiry)} />
              </ConformiteBlock>
            </div>

            <SectionTitle icon={Users}>Directeur(s) & membres</SectionTitle>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {agency.directors.length ? (
                agency.directors.map((d) => (
                  <span key={d.id} className="rounded-md bg-brand-card-soft px-2 py-1 text-xs">
                    {d.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-soft">Aucun directeur renseigné.</span>
              )}
            </div>
            <div className="space-y-1.5">
              {agency.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm"
                >
                  <span>{m.name}</span>
                  <span className="text-text-soft">{m.functionTitle}</span>
                </div>
              ))}
            </div>

            {agency.sharePointUrl ? (
              <a
                href={agency.sharePointUrl}
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
