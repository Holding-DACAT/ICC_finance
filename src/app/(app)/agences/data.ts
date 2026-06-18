import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AgencyDTO, AgencyKpis, MemberOption } from "./types";

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

export interface AgencesData {
  agencies: AgencyDTO[];
  memberOptions: MemberOption[];
  kpis: AgencyKpis;
  available: boolean;
}

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

export async function getAgencesData(user: SessionUser): Promise<AgencesData> {
  try {
    const where =
      user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId ? { id: user.scopedAgencyId } : {};

    const [rows, members] = await Promise.all([
      prisma.agency.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          directors: {
            include: { member: { select: { id: true, firstName: true, lastName: true } } },
          },
          members: {
            select: { id: true, firstName: true, lastName: true, functionTitle: true },
            orderBy: { lastName: "asc" },
          },
        },
      }),
      prisma.member.findMany({
        orderBy: { lastName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    const agencies: AgencyDTO[] = rows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      legalName: a.legalName,
      legalForm: a.legalForm,
      siren: a.siren,
      address: a.address,
      phone: a.phone,
      email: a.email,
      oriasNumber: a.oriasNumber,
      rcProInsurer: a.rcProInsurer,
      rcProExpiry: a.rcProExpiry?.toISOString() ?? null,
      guaranteeAmount: a.guaranteeAmount,
      guaranteeExpiry: a.guaranteeExpiry?.toISOString() ?? null,
      sharePointUrl: a.sharePointUrl,
      redevanceExcluded: a.redevanceExcluded,
      directors: a.directors.map((d) => ({ id: d.member.id, name: memberName(d.member) })),
      members: a.members.map((m) => ({
        id: m.id,
        name: memberName(m),
        functionTitle: m.functionTitle,
      })),
    }));

    const kpis: AgencyKpis = {
      actives: agencies.filter((a) => a.status === "ACTIF").length,
      inactives: agencies.filter((a) => a.status === "INACTIF").length,
      franchises: agencies.filter((a) => a.type === "FRANCHISE").length,
      filiales: agencies.filter((a) => a.type === "FILIALE").length,
    };

    const memberOptions: MemberOption[] = members.map((m) => ({ id: m.id, name: memberName(m) }));

    return { agencies, memberOptions, kpis, available: true };
  } catch {
    return {
      agencies: [],
      memberOptions: [],
      kpis: { actives: 0, inactives: 0, franchises: 0, filiales: 0 },
      available: false,
    };
  }
}
