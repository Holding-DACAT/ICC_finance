import { computeComplianceStatus, daysUntil } from "@/lib/compliance";
import { computeComputerStatus } from "@/lib/computer";
import { prisma } from "@/lib/prisma";

export type AlertSeverity = "warning" | "danger";

export interface AlertItem {
  id: string;
  subject: string;
  detail: string;
  severity: AlertSeverity;
}

export interface AlertsResult {
  available: boolean;
  orias: AlertItem[];
  rcPro: AlertItem[];
  parc: AlertItem[];
  formation: AlertItem[];
  total: number;
}

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

export async function getAlerts(): Promise<AlertsResult> {
  try {
    const now = new Date();
    const [members, computers] = await Promise.all([
      prisma.member.findMany({
        where: { status: "ACTIF" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          orias: {
            select: { renewalDate: true, rcProExpiry: true, oriasNumber: true },
          },
          trainings: {
            where: { year: now.getFullYear() },
            select: { requiredHours: true, completedHours: true },
            take: 1,
          },
        },
      }),
      prisma.computer.findMany({
        select: {
          id: true,
          name: true,
          registrationDate: true,
          assignedMember: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const orias: AlertItem[] = [];
    const rcPro: AlertItem[] = [];
    const formation: AlertItem[] = [];

    for (const m of members) {
      if (m.orias?.renewalDate) {
        const status = computeComplianceStatus(m.orias.renewalDate, now);
        if (status !== "A_JOUR") {
          orias.push({
            id: `orias-${m.id}`,
            subject: memberName(m),
            detail:
              status === "EXPIRE"
                ? `Immatriculation ORIAS expirée (${m.orias.oriasNumber ?? "—"})`
                : `Renouvellement ORIAS dans ${daysUntil(m.orias.renewalDate, now)} j`,
            severity: status === "EXPIRE" ? "danger" : "warning",
          });
        }
      }
      if (m.orias?.rcProExpiry) {
        const status = computeComplianceStatus(m.orias.rcProExpiry, now);
        if (status !== "A_JOUR") {
          rcPro.push({
            id: `rcpro-${m.id}`,
            subject: memberName(m),
            detail:
              status === "EXPIRE"
                ? "RC Pro échue"
                : `RC Pro à échéance dans ${daysUntil(m.orias.rcProExpiry, now)} j`,
            severity: status === "EXPIRE" ? "danger" : "warning",
          });
        }
      }
      const t = m.trainings[0];
      if (t && t.completedHours < t.requiredHours) {
        formation.push({
          id: `formation-${m.id}`,
          subject: memberName(m),
          detail: `Formation continue : ${t.completedHours}/${t.requiredHours} h`,
          severity: "warning",
        });
      }
    }

    const parc: AlertItem[] = [];
    for (const c of computers) {
      const status = computeComputerStatus(c.registrationDate);
      if (status !== "ACTIF") {
        parc.push({
          id: `parc-${c.id}`,
          subject: c.name,
          detail:
            (status === "EXPIRE" ? "Poste expiré (> 36 mois)" : "Poste à renouveler (> 34 mois)") +
            (c.assignedMember ? ` · ${memberName(c.assignedMember)}` : " · libre"),
          severity: status === "EXPIRE" ? "danger" : "warning",
        });
      }
    }

    return {
      available: true,
      orias,
      rcPro,
      parc,
      formation,
      total: orias.length + rcPro.length + parc.length + formation.length,
    };
  } catch {
    return { available: false, orias: [], rcPro: [], parc: [], formation: [], total: 0 };
  }
}
