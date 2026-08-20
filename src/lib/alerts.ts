import { computeEcart, formatMonth } from "@/lib/apporteur";
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
  /** Contrôles back-office sur les apporteurs (vide si le rôle n'y a pas accès). */
  apporteurs: AlertItem[];
  total: number;
}

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

/**
 * Contrôles back-office sur les ristournes apporteurs : convention manquante
 * ou non signée, ristourne due non versée, SIREN/kbis non vérifiés, écart avec
 * la règle de la convention. Les montants ne sont pas exposés ici.
 */
async function getApporteurAlerts(now: Date): Promise<AlertItem[]> {
  const currentYear = now.getFullYear();
  const versements = await prisma.apporteurVersement.findMany({
    where: { status: { not: "ANNULE" } },
    orderBy: [{ year: "desc" }, { paymentDate: "desc" }],
    select: {
      id: true,
      year: true,
      month: true,
      dossierLabel: true,
      amountCents: true,
      commissionCents: true,
      feesCents: true,
      sirenVerified: true,
      status: true,
      paymentDate: true,
      createdAt: true,
      apporteur: { select: { name: true, kbisDate: true } },
      convention: {
        select: {
          signatureStatus: true,
          remunerationType: true,
          remunerationRate: true,
          remunerationFixedCents: true,
          remunerationCapCents: true,
          remunerationBase: true,
        },
      },
    },
  });

  const items: AlertItem[] = [];
  const conventionSeen = new Set<string>();
  const sirenSeen = new Set<string>();

  for (const v of versements) {
    const subject = v.apporteur.name;
    const dossier = `${v.dossierLabel} · ${formatMonth(v.month)} ${v.year}`;

    // Convention absente ou non signée : une alerte par apporteur.
    if (!v.convention || v.convention.signatureStatus !== "SIGNEE") {
      if (!conventionSeen.has(subject)) {
        conventionSeen.add(subject);
        items.push({
          id: `apporteur-convention-${v.id}`,
          subject,
          detail: v.convention
            ? "Convention non signée alors que des ristournes sont versées"
            : "Ristournes versées sans convention enregistrée",
          severity: v.convention ? "warning" : "danger",
        });
      }
    }

    // Ristourne due et non versée (urgente au-delà de 60 jours).
    if (v.status === "A_VERSER") {
      const ageDays = Math.floor((now.getTime() - v.createdAt.getTime()) / 86_400_000);
      items.push({
        id: `apporteur-encours-${v.id}`,
        subject,
        detail: `Ristourne due non versée — ${dossier}`,
        severity: ageDays > 60 ? "danger" : "warning",
      });
    }

    // SIREN non vérifié ou kbis manquant : une alerte par apporteur, limitée
    // aux exercices récents (les exercices clos ne sont plus régularisables).
    if (
      v.year >= currentYear - 1 &&
      (!v.sirenVerified || !v.apporteur.kbisDate) &&
      !sirenSeen.has(subject)
    ) {
      sirenSeen.add(subject);
      items.push({
        id: `apporteur-siren-${v.id}`,
        subject,
        detail: !v.apporteur.kbisDate
          ? "Kbis manquant au dossier de l'apporteur"
          : "SIREN non vérifié sur les versements",
        severity: "warning",
      });
    }

    // Écart entre le montant versé et la règle de la convention.
    if (v.convention) {
      const ecart = computeEcart(
        {
          type: v.convention.remunerationType,
          rate: v.convention.remunerationRate,
          fixedCents: v.convention.remunerationFixedCents,
          capCents: v.convention.remunerationCapCents,
          base: v.convention.remunerationBase,
        },
        { commissionCents: v.commissionCents, feesCents: v.feesCents },
        v.amountCents,
      );
      if (ecart.isAnomaly) {
        items.push({
          id: `apporteur-ecart-${v.id}`,
          subject,
          detail: `Écart avec la règle de la convention — ${dossier}`,
          severity: "warning",
        });
      }
    }
  }

  return items;
}

/**
 * @param options.includeApporteurs à activer uniquement pour un rôle habilité
 *   au module apporteurs (cf. `canReadApporteurs`).
 */
export async function getAlerts(options?: { includeApporteurs?: boolean }): Promise<AlertsResult> {
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

    const apporteurs = options?.includeApporteurs ? await getApporteurAlerts(now) : [];

    return {
      available: true,
      orias,
      rcPro,
      parc,
      formation,
      apporteurs,
      total:
        orias.length + rcPro.length + parc.length + formation.length + apporteurs.length,
    };
  } catch {
    return {
      available: false,
      orias: [],
      rcPro: [],
      parc: [],
      formation: [],
      apporteurs: [],
      total: 0,
    };
  }
}
