"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Laptop,
  Mail,
  Maximize2,
  Minimize2,
  Pencil,
  ShieldCheck,
  User,
} from "lucide-react";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComplianceBadge, MemberStatusBadge } from "@/components/status-badges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDate, formatEur, monthsSince } from "@/lib/format";
import { ORIAS_LABELS } from "@/lib/labels";
import type { MemberDTO } from "../types";

interface MemberDetailSheetProps {
  member: MemberDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ouvre le formulaire d'édition (affiché seulement si fourni). */
  onEdit?: (member: MemberDTO) => void;
}

export function MemberDetailSheet({ member, open, onOpenChange, onEdit }: MemberDetailSheetProps) {
  const [expanded, setExpanded] = useState(false);

  // Repartir de la vue compacte à chaque ouverture d'une fiche.
  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "transition-[width,max-width] duration-300",
          expanded && "w-[1100px] max-w-[96vw]",
        )}
      >
        {member ? (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Réduire la fenêtre" : "Agrandir la fenêtre"}
              className="absolute right-14 top-5 grid size-8 place-items-center rounded-lg bg-card text-text-soft transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            <SheetHeader>
              <div className="flex items-center gap-3 pr-16">
                <Avatar
                  first={member.firstName}
                  last={member.lastName}
                  active={member.status === "ACTIF"}
                  photoUrl={member.photoUrl}
                />
                <div>
                  <SheetTitle>
                    {member.lastName} {member.firstName}
                  </SheetTitle>
                  <div className="text-xs text-text-soft">
                    {member.functionTitle} · {member.agencyName}
                  </div>
                </div>
                {onEdit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => onEdit(member)}
                  >
                    <Pencil className="size-3.5" /> Éditer
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <div className="mb-4 mt-3 inline-flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs text-text-soft">
              <Mail className="size-3.5" /> {member.email}
            </div>

            {expanded ? (
              // --- Vue agrandie : toutes les infos d'un seul coup d'œil ---
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ExpandedSection icon={User} title="RH">
                  <RhContent member={member} />
                </ExpandedSection>
                <ExpandedSection icon={ShieldCheck} title="Habilitation">
                  <OriasContent member={member} />
                </ExpandedSection>
                <ExpandedSection icon={GraduationCap} title="Formation">
                  <FormationContent member={member} />
                </ExpandedSection>
                <ExpandedSection icon={Laptop} title="Informatique">
                  <InfoContent member={member} />
                </ExpandedSection>
              </div>
            ) : (
              // --- Vue compacte : onglets ---
              <Tabs defaultValue="rh">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="rh">
                    <User className="mr-1 size-3.5" /> RH
                  </TabsTrigger>
                  <TabsTrigger value="orias">
                    <ShieldCheck className="mr-1 size-3.5" /> Habilitation
                  </TabsTrigger>
                  <TabsTrigger value="formation">
                    <GraduationCap className="mr-1 size-3.5" /> Formation
                  </TabsTrigger>
                  <TabsTrigger value="info">
                    <Laptop className="mr-1 size-3.5" /> Informatique
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="rh">
                  <RhContent member={member} />
                </TabsContent>
                <TabsContent value="orias">
                  <OriasContent member={member} />
                </TabsContent>
                <TabsContent value="formation">
                  <FormationContent member={member} />
                </TabsContent>
                <TabsContent value="info">
                  <InfoContent member={member} />
                </TabsContent>
              </Tabs>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* --- Contenus de section (partagés entre vue onglets et vue agrandie) --- */

function RhContent({ member }: { member: MemberDTO }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Info label="Nom" value={member.lastName} />
      <Info label="Prénom" value={member.firstName} />
      <Info label="Adresse mail ICC Finance" value={member.email} />
      <Info label="Adresse mail personnelle" value={member.personalEmail ?? "—"} />
      <Info label="N° téléphone" value={member.phone ?? "—"} />
      <Info label="Adresse postale" value={member.postalAddress ?? "—"} />
      <Info label="Date de naissance" value={formatDate(member.birthDate)} />
      <Info label="Date d'arrivée" value={formatDate(member.arrivalDate)} />
      <Info label="Date de départ" value={formatDate(member.departureDate)} />
      <Info label="Statut">
        <MemberStatusBadge status={member.status} onboardingStatus={member.onboardingStatus} />
      </Info>
      <Info label="Fonction" value={member.functionTitle} />
      <Info label="Poste occupé" value={member.functionSub ?? "—"} />
      <Info label="SIREN" value={member.siren ?? "—"} />
      <Info label="Mentions légales" value={member.legalMentions ?? "—"} />
      <Info
        label="Société de rattachement"
        value={member.companyName ?? member.agencyLegalName ?? "—"}
      />
      <Info label="Agence de rattachement" value={member.agencyName} />
    </div>
  );
}

function OriasContent({ member }: { member: MemberDTO }) {
  if (!member.orias) {
    return <Empty>Aucune habilitation (fonction support).</Empty>;
  }
  return (
    <div className="space-y-4">
      <HabilitationSection title="ORIAS">
        <Row label="N° ORIAS" value={member.orias.oriasNumber ?? "—"} />
        <Row label="Identifiant ORIAS" value={member.orias.oriasLogin ?? "—"} />
        <Row label="Mot de passe ORIAS" value={member.orias.oriasPassword ?? "—"} />
        <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm">
          <span className="text-text-soft">Conformité</span>
          <ComplianceBadge status={member.orias.status} />
        </div>
        {member.orias.categories.map((c) => (
          <div
            key={c}
            className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm"
          >
            <span>
              <strong>{c}</strong>{" "}
              <span className="text-text-soft">— {ORIAS_LABELS[c] ?? "Catégorie"}</span>
            </span>
          </div>
        ))}
      </HabilitationSection>

      <HabilitationSection title="RC Pro">
        <Row label="Assureur" value={member.orias.rcProInsurer ?? "—"} />
        <Row label="N° police / contrat" value={member.orias.rcProPolicy ?? "—"} />
        <Row label="Échéance" value={formatDate(member.orias.rcProExpiry)} />
      </HabilitationSection>

      <HabilitationSection title="Garantie financière">
        <Row
          label="Montant"
          value={
            member.orias.guaranteeAmount != null ? formatEur(member.orias.guaranteeAmount) : "—"
          }
        />
        <Row label="Échéance" value={formatDate(member.orias.guaranteeExpiry)} />
      </HabilitationSection>

      {/* Associations professionnelles distinctes (accès séparés). */}
      <HabilitationSection title="Association professionnelle — MIOBSP">
        <Row label="Identifiant" value={member.orias.assocMiobspLogin ?? "—"} />
        <Row label="Mot de passe" value={member.orias.assocMiobspPassword ?? "—"} />
      </HabilitationSection>

      <HabilitationSection title="Association professionnelle — MIA">
        <Row label="Identifiant" value={member.orias.assocMiaLogin ?? "—"} />
        <Row label="Mot de passe" value={member.orias.assocMiaPassword ?? "—"} />
      </HabilitationSection>
    </div>
  );
}

function FormationContent({ member }: { member: MemberDTO }) {
  if (!member.training) {
    return <Empty>Non soumis à l&apos;obligation de formation continue.</Empty>;
  }
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-card px-3 py-3">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-text-soft">Formation continue {member.training.year}</span>
          <span className="font-semibold">
            {member.training.completedHours} / {member.training.requiredHours} h
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={
              member.training.completedHours >= member.training.requiredHours
                ? "h-full rounded-full bg-state-success"
                : "h-full rounded-full bg-state-warning"
            }
            style={{
              width: `${Math.min(
                100,
                (member.training.completedHours / member.training.requiredHours) * 100,
              )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function InfoContent({ member }: { member: MemberDTO }) {
  return (
    <div className="space-y-2">
      {member.computers.length > 0 ? (
        member.computers.map((c) => {
          const age = monthsSince(c.registrationDate);
          const variant = age > 36 ? "danger" : age > 34 ? "warning" : "success";
          const label = age > 36 ? "À remplacer" : age > 34 ? "À renouveler" : "OK";
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm"
            >
              <span>
                {c.name} · <span className="text-text-soft">{c.model}</span>
              </span>
              <Badge variant={variant}>{label}</Badge>
            </div>
          );
        })
      ) : (
        <Empty>Aucun poste attribué.</Empty>
      )}
      <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm">
        <span className="text-text-soft">Onboarding</span>
        <span className="font-semibold">{member.onboardingStatus ?? "Aucun"}</span>
      </div>
    </div>
  );
}

/* --- Helpers de présentation --- */

function ExpandedSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 text-primary" /> {title}
      </div>
      {children}
    </section>
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

function HabilitationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-primary">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm">
      <span className="text-text-soft">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-card px-3 py-4 text-sm text-text-soft">{children}</div>;
}
