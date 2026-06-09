import type { Prisma, Role } from "@prisma/client";

import { computeComputerStatus } from "@/lib/computer";
import { prisma } from "@/lib/prisma";
import type { AgencyOption, ComputerDTO, ComputerKpis, MemberOption } from "./types";

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

export interface OrdinateursData {
  computers: ComputerDTO[];
  memberOptions: MemberOption[];
  agencyOptions: AgencyOption[];
  kpis: ComputerKpis;
  available: boolean;
}

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

export async function getOrdinateursData(user: SessionUser): Promise<OrdinateursData> {
  try {
    // Un directeur ne voit que les postes des membres de son agence.
    const where: Prisma.ComputerWhereInput =
      user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId
        ? { assignedMember: { agencyId: user.scopedAgencyId } }
        : {};

    const [rows, members, agencies] = await Promise.all([
      prisma.computer.findMany({
        where,
        orderBy: { registrationDate: "desc" },
        include: {
          assignedMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              agency: { select: { name: true } },
            },
          },
        },
      }),
      prisma.member.findMany({
        orderBy: { lastName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.agency.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

    const computers: ComputerDTO[] = rows.map((c) => ({
      id: c.id,
      name: c.name,
      model: c.model,
      serialNumber: c.serialNumber,
      registrationDate: c.registrationDate.toISOString(),
      lastSyncDate: c.lastSyncDate?.toISOString() ?? null,
      diskFreePct: c.diskFreePct,
      licenseTier: c.licenseTier,
      source: c.source,
      assignedMemberId: c.assignedMemberId,
      assignedMemberName: c.assignedMember ? memberName(c.assignedMember) : null,
      agencyName: c.assignedMember?.agency.name ?? null,
      status: computeComputerStatus(c.registrationDate),
    }));

    const kpis: ComputerKpis = {
      assigned: computers.filter((c) => c.assignedMemberId).length,
      free: computers.filter((c) => !c.assignedMemberId).length,
      toRenew: computers.filter((c) => c.status === "A_RENOUVELER" || c.status === "EXPIRE").length,
      expired: computers.filter((c) => c.status === "EXPIRE").length,
    };

    return {
      computers,
      memberOptions: members.map((m) => ({ id: m.id, name: memberName(m) })),
      agencyOptions: agencies,
      kpis,
      available: true,
    };
  } catch {
    return {
      computers: [],
      memberOptions: [],
      agencyOptions: [],
      kpis: { assigned: 0, free: 0, toRenew: 0, expired: 0 },
      available: false,
    };
  }
}
