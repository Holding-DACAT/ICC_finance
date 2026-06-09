import { prisma } from "@/lib/prisma";

/**
 * Comptes agrégés pour les cartes KPI du Lot 0.
 * Tout échec base (ex. environnement sans BDD) est neutralisé : on renvoie des
 * zéros afin que l'interface reste navigable. Les calculs métier précis sont
 * implémentés dans les lots dédiés.
 */
export interface OverviewStats {
  members: number;
  membersActive: number;
  membersInactive: number;
  agencies: number;
  agenciesFranchise: number;
  agenciesFiliale: number;
  computers: number;
  computersAssigned: number;
  available: boolean;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  try {
    const [
      members,
      membersActive,
      membersInactive,
      agencies,
      agenciesFranchise,
      agenciesFiliale,
      computers,
      computersAssigned,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { status: "ACTIF" } }),
      prisma.member.count({ where: { status: "INACTIF" } }),
      prisma.agency.count(),
      prisma.agency.count({ where: { type: "FRANCHISE" } }),
      prisma.agency.count({ where: { type: "FILIALE" } }),
      prisma.computer.count(),
      prisma.computer.count({ where: { assignedMemberId: { not: null } } }),
    ]);

    return {
      members,
      membersActive,
      membersInactive,
      agencies,
      agenciesFranchise,
      agenciesFiliale,
      computers,
      computersAssigned,
      available: true,
    };
  } catch {
    return {
      members: 0,
      membersActive: 0,
      membersInactive: 0,
      agencies: 0,
      agenciesFranchise: 0,
      agenciesFiliale: 0,
      computers: 0,
      computersAssigned: 0,
      available: false,
    };
  }
}
