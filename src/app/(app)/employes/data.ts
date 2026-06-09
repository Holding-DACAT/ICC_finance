import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AgencyOption, MemberDTO, MemberKpis } from "./types";

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

export interface EmployesData {
  members: MemberDTO[];
  agencies: AgencyOption[];
  kpis: MemberKpis;
  available: boolean;
}

export async function getEmployesData(user: SessionUser): Promise<EmployesData> {
  try {
    const where = memberScope(user);
    const currentYear = new Date().getFullYear();

    const [rows, agencies] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          agency: { select: { name: true } },
          orias: {
            select: {
              oriasNumber: true,
              categories: true,
              status: true,
              renewalDate: true,
            },
          },
          trainings: {
            where: { year: currentYear },
            select: { year: true, requiredHours: true, completedHours: true },
            take: 1,
          },
          computers: {
            select: { id: true, name: true, model: true, registrationDate: true },
          },
          onboarding: { select: { status: true } },
        },
      }),
      prisma.agency.findMany({
        where: user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId
          ? { id: user.scopedAgencyId }
          : {},
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const members: MemberDTO[] = rows.map((m) => ({
      id: m.id,
      civility: m.civility,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      contractType: m.contractType,
      functionTitle: m.functionTitle,
      functionSub: m.functionSub,
      network: m.network,
      status: m.status,
      agencyId: m.agencyId,
      agencyName: m.agency.name,
      arrivalDate: m.arrivalDate.toISOString(),
      departureDate: m.departureDate?.toISOString() ?? null,
      orias: m.orias
        ? {
            oriasNumber: m.orias.oriasNumber,
            categories: m.orias.categories,
            status: m.orias.status,
            renewalDate: m.orias.renewalDate?.toISOString() ?? null,
          }
        : null,
      training: m.trainings[0]
        ? {
            year: m.trainings[0].year,
            requiredHours: m.trainings[0].requiredHours,
            completedHours: m.trainings[0].completedHours,
          }
        : null,
      computers: m.computers.map((c) => ({
        id: c.id,
        name: c.name,
        model: c.model,
        registrationDate: c.registrationDate.toISOString(),
      })),
      onboardingStatus: m.onboarding?.status ?? null,
    }));

    const kpis: MemberKpis = {
      actifs: members.filter((m) => m.status === "ACTIF").length,
      inactifs: members.filter((m) => m.status === "INACTIF").length,
      franchises: members.filter((m) => m.network === "FRANCHISE").length,
      filiales: members.filter((m) => m.network === "FILIALE").length,
    };

    return { members, agencies, kpis, available: true };
  } catch {
    return {
      members: [],
      agencies: [],
      kpis: { actifs: 0, inactifs: 0, franchises: 0, filiales: 0 },
      available: false,
    };
  }
}
