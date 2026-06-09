import type { ComplianceStatus, MemberStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant={status === "ACTIF" ? "success" : "warning"}>
      {status === "ACTIF" ? "ACTIF" : "INACTIF"}
    </Badge>
  );
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
