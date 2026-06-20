import type {
  ComplianceStatus,
  HabilitationStatus,
  MemberStatus,
  NetworkType,
  Role,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

/** Périmètre de lecture : un directeur d'agence ne voit que son agence. */
function memberScope(user: SessionUser) {
  if (user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId) {
    return { agencyId: user.scopedAgencyId };
  }
  return {};
}

/** Ligne d'habilitation (DTO sérialisable : dates en ISO) pour le tableau. */
export interface HabilitationRow {
  memberId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  agencyName: string;
  functionTitle: string;
  functionSub: string | null;
  network: NetworkType;
  memberStatus: MemberStatus;
  oriasNumber: string | null;
  categories: string[];
  complianceStatus: ComplianceStatus;
  renewalDate: string | null;
  rcProInsurer: string | null;
  rcProExpiry: string | null;
  guaranteeAmount: number | null;
  guaranteeExpiry: string | null;
  habilitationStatus: HabilitationStatus;
  habilitationYear: number | null;
  habilitationValidatedAt: string | null;
}

export interface HabilitationKpis {
  total: number;
  validees: number;
  aValider: number;
  expirees: number;
}

export interface HabilitationData {
  rows: HabilitationRow[];
  kpis: HabilitationKpis;
  year: number;
  available: boolean;
}

/** KPIs (calcul pur, testable sans base) à partir des lignes d'habilitation. */
export function computeHabilitationKpis(rows: HabilitationRow[]): HabilitationKpis {
  return {
    total: rows.length,
    validees: rows.filter((r) => r.habilitationStatus === "VALIDEE").length,
    aValider: rows.filter((r) => r.habilitationStatus === "A_VALIDER").length,
    expirees: rows.filter((r) => r.complianceStatus === "EXPIRE").length,
  };
}

/**
 * Habilitations des équipes : pour chaque membre possédant une habilitation
 * (immatriculation ORIAS), l'ensemble des informations + le statut annuel
 * d'habilitation (remis à zéro chaque 1er janvier). Périmètre d'agence appliqué.
 */
export async function getHabilitationsData(user: SessionUser): Promise<HabilitationData> {
  const year = new Date().getFullYear();
  try {
    const members = await prisma.member.findMany({
      where: { ...memberScope(user), orias: { isNot: null } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        agency: { select: { name: true } },
        orias: {
          select: {
            oriasNumber: true,
            categories: true,
            status: true,
            renewalDate: true,
            rcProInsurer: true,
            rcProExpiry: true,
            guaranteeAmount: true,
            guaranteeExpiry: true,
            habilitationStatus: true,
            habilitationYear: true,
            habilitationValidatedAt: true,
          },
        },
      },
    });

    const rows: HabilitationRow[] = members
      .filter((m) => m.orias)
      .map((m) => {
        const o = m.orias!;
        return {
          memberId: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          fullName: `${m.lastName} ${m.firstName}`,
          agencyName: m.agency.name,
          functionTitle: m.functionTitle,
          functionSub: m.functionSub,
          network: m.network,
          memberStatus: m.status,
          oriasNumber: o.oriasNumber,
          categories: o.categories,
          complianceStatus: o.status,
          renewalDate: o.renewalDate?.toISOString() ?? null,
          rcProInsurer: o.rcProInsurer,
          rcProExpiry: o.rcProExpiry?.toISOString() ?? null,
          guaranteeAmount: o.guaranteeAmount,
          guaranteeExpiry: o.guaranteeExpiry?.toISOString() ?? null,
          habilitationStatus: o.habilitationStatus,
          habilitationYear: o.habilitationYear,
          habilitationValidatedAt: o.habilitationValidatedAt?.toISOString() ?? null,
        };
      });

    return { rows, kpis: computeHabilitationKpis(rows), year, available: true };
  } catch {
    return {
      rows: [],
      kpis: { total: 0, validees: 0, aValider: 0, expirees: 0 },
      year,
      available: false,
    };
  }
}

/**
 * Remet à zéro le statut d'habilitation de toutes les équipes : passe chaque
 * immatriculation ORIAS à `A_VALIDER` et efface l'horodatage de validation.
 * Appelé chaque 1er janvier par le cron `habilitation-reset`. Renvoie le nombre
 * de fiches réinitialisées.
 */
export async function resetHabilitations(): Promise<number> {
  const result = await prisma.oriasRegistration.updateMany({
    data: { habilitationStatus: "A_VALIDER", habilitationValidatedAt: null },
  });
  return result.count;
}
