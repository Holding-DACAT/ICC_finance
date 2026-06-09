"use client";

import { GraduationCap, Laptop, Mail, ShieldCheck, User } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { ComplianceBadge, MemberStatusBadge } from "@/components/status-badges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, monthsSince } from "@/lib/format";
import { CONTRACT_LABELS, NETWORK_LABELS, ORIAS_LABELS } from "@/lib/labels";
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
                <Avatar first={member.firstName} last={member.lastName} active={member.status === "ACTIF"} />
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
                  <ShieldCheck className="mr-1 size-3.5" /> ORIAS
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
                  <Info label="Statut">
                    <MemberStatusBadge status={member.status} />
                  </Info>
                  <Info label="Type de contrat" value={CONTRACT_LABELS[member.contractType]} />
                  <Info label="Réseau" value={NETWORK_LABELS[member.network]} />
                  <Info label="Téléphone" value={member.phone ?? "—"} />
                  <Info label="Arrivée" value={formatDate(member.arrivalDate)} />
                  <Info label="Départ" value={formatDate(member.departureDate)} />
                  <Info label="Fonction" value={member.functionTitle} />
                  <Info label="Précision" value={member.functionSub ?? "—"} />
                </div>
              </TabsContent>

              {/* --- ORIAS --- */}
              <TabsContent value="orias">
                {member.orias ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm">
                      <span className="text-text-soft">N° ORIAS</span>
                      <span className="font-semibold">{member.orias.oriasNumber ?? "—"}</span>
                    </div>
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
                          <span className="text-text-soft">— {ORIAS_LABELS[c] ?? "Catégorie"}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty>Aucune immatriculation ORIAS (fonction support).</Empty>
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
                              (member.training.completedHours / member.training.requiredHours) * 100,
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-card px-3 py-4 text-sm text-text-soft">{children}</div>;
}
