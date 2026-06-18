import type { ComplianceStatus, MemberStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const MEMBER_STATUS_META: Record<
  MemberStatus,
  { label: string; variant: "success" | "danger" | "info" }
> = {
  ACTIF: { label: "ACTIF", variant: "success" },
  INACTIF: { label: "INACTIF", variant: "danger" },
  EN_COURS_ENREGISTREMENT: { label: "EN COURS D'ENREG.", variant: "info" },
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
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
