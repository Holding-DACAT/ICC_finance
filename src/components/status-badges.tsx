import type {
  ComplianceStatus,
  ConventionStatus,
  MemberStatus,
  OnboardingStatus,
  VersementStatus,
} from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const MEMBER_STATUS_META: Record<
  MemberStatus,
  { label: string; variant: "success" | "danger" | "info" }
> = {
  ACTIF: { label: "ACTIF", variant: "success" },
  INACTIF: { label: "INACTIF", variant: "danger" },
  EN_COURS_ENREGISTREMENT: { label: "EN COURS D'ENREG.", variant: "info" },
};

export function MemberStatusBadge({
  status,
  onboardingStatus,
}: {
  status: MemberStatus;
  onboardingStatus?: OnboardingStatus | null;
}) {
  // Tant que la personne est dans le kanban (intégration non terminée),
  // on affiche « En cours d'intégration » (bleu) plutôt que son statut.
  if (onboardingStatus && onboardingStatus !== "TERMINE") {
    return <Badge variant="info">En cours d&apos;intégration</Badge>;
  }
  const meta = MEMBER_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  A_JOUR: "À jour",
  A_RENOUVELER: "À renouveler",
  EXPIRE: "Expiré",
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const variant =
    status === "A_JOUR" ? "success" : status === "A_RENOUVELER" ? "warning" : "danger";
  return <Badge variant={variant}>{COMPLIANCE_LABEL[status]}</Badge>;
}

const CONVENTION_META: Record<
  ConventionStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  SIGNEE: { label: "Signée", variant: "success" },
  A_FAIRE: { label: "À faire", variant: "warning" },
  NON_SIGNEE: { label: "Non signée", variant: "danger" },
  RESILIEE: { label: "Résiliée", variant: "neutral" },
};

/** Statut de signature d'une convention d'apport. */
export function ConventionStatusBadge({ status }: { status: ConventionStatus }) {
  const meta = CONVENTION_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const VERSEMENT_META: Record<
  VersementStatus,
  { label: string; variant: "success" | "warning" | "neutral" }
> = {
  VERSE: { label: "Versé", variant: "success" },
  A_VERSER: { label: "À verser", variant: "warning" },
  ANNULE: { label: "Annulé", variant: "neutral" },
};

/** Statut d'un versement de ristourne à un apporteur. */
export function VersementStatusBadge({ status }: { status: VersementStatus }) {
  const meta = VERSEMENT_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
