"use client";

import { GraduationCap, Laptop, Mail, ShieldCheck, User } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { ComplianceBadge, MemberStatusBadge } from "@/components/status-badges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, monthsSince } from "@/lib/format";
import { ORIAS_LABELS } from "@/lib/labels";
import type { MemberDTO } from "../types";

interface MemberDetailSheetProps {
  member: MemberDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailSheet({ member, open, onOpenChange }: MemberDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {member ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar
                  first={member.firstName}
                  last={member.lastName}
                  active={member.status === "ACTIF"}
                />
                <div>
                  <SheetTitle>
                    {member.lastName} {member.firstName}
                  </SheetTitle>
                  <div className="text-xs text-text-soft">
                    {member.functionTitle} · {member.agencyName}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mb-4 mt-3 inline-flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs text-text-soft">
              <Mail className="size-3.5" /> {member.email}
            </div>

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

              {/* --- RH --- */}
              <TabsContent value="rh">
                <div className="grid grid-cols-2 gap-2.5">
                  <Info label="Nom" value={member.lastName} />
                  <Info label="Prénom" value={member.firstName} />
                  <Info label="Adresse mail" value={member.email} />
                  <Info label="N° téléphone" value={member.phone ?? "—"} />
                  <Info label="Adresse postale" value={member.postalAddress ?? "—"} />
                  <Info label="Date de naissance" value={formatDate(member.birthDate)} />
                  <Info label="Date d'arrivée" value={formatDate(member.arrivalDate)} />
                  <Info label="Date de départ" value={formatDate(member.departureDate)} />
                  <Info label="Statut">
                    <MemberStatusBadge status={member.status} />
                  </Info>
                  <Info label="Fonction" value={member.functionTitle} />
                  <Info label="SIREN" value={member.siren ?? "—"} />
                  <Info label="Mentions légales" value={member.legalMentions ?? "—"} />
                  <Info
                    label="Raison sociale (agence de rattachement)"
                    value={member.agencyLegalName ?? member.agencyName}
                  />
                </div>
              </TabsContent>

              {/* --- Habilitation --- */}
              <TabsContent value="orias">
                {member.orias ? (
                  <div className="space-y-4">
                    {/* ORIAS */}
                    <HabilitationSection title="ORIAS">
                      <Row label="N° ORIAS" value={member.orias.oriasNumber ?? "—"} />
                      <Row label="Identifiant ORIAS" value={member.orias.oriasLogin ?? "—"} />
                      <Row label="Mot de passe ORIAS" value={member.orias.oriasPassword ?? "—"} />
                      <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm">
                        <span className="text-text-soft">Renouvellement</span>
                        <div className="flex items-center gap-2">
                          <span>{formatDate(member.orias.renewalDate)}</span>
                          <ComplianceBadge status={member.orias.status} />
                        </div>
                      </div>
                      {member.orias.categories.map((c) => (
                        <div
                          key={c}
                          className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm"
                        >
                          <span>
                            <strong>{c}</strong>{" "}
                            <span className="text-text-soft">
                              — {ORIAS_LABELS[c] ?? "Catégorie"}
                            </span>
                          </span>
                        </div>
                      ))}
                    </HabilitationSection>

                    {/* Assurances */}
                    <HabilitationSection title="Assurances">
                      <Row label="Nom assureur" value={member.orias.rcProInsurer ?? "—"} />
                      <Row label="N° police / contrat" value={member.orias.rcProPolicy ?? "—"} />
                    </HabilitationSection>

                    {/* Associations professionnelles */}
                    <HabilitationSection title="Associations professionnelles">
                      <Row label="Identifiant" value={member.orias.assocLogin ?? "—"} />
                      <Row label="Mot de passe" value={member.orias.assocPassword ?? "—"} />
                    </HabilitationSection>
                  </div>
                ) : (
                  <Empty>Aucune habilitation (fonction support).</Empty>
                )}
              </TabsContent>

              {/* --- Formation --- */}
              <TabsContent value="formation">
                {member.training ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-card px-3 py-3">
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-text-soft">
                          Formation continue {member.training.year}
                        </span>
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
                              (member.training.completedHours / member.training.requiredHours) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty>Non soumis à l&apos;obligation de formation continue.</Empty>
                )}
              </TabsContent>

              {/* --- Informatique --- */}
              <TabsContent value="info">
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
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
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
