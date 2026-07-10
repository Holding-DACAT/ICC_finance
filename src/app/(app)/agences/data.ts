import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AgencyDTO, AgencyKpis, CompanyOption, MemberOption } from "./types";

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

export interface AgencesData {
  agencies: AgencyDTO[];
  memberOptions: MemberOption[];
  companyOptions: CompanyOption[];
  kpis: AgencyKpis;
  available: boolean;
}

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

export async function getAgencesData(user: SessionUser): Promise<AgencesData> {
  try {
    const where =
      user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId ? { id: user.scopedAgencyId } : {};

    const [rows, members, companies] = await Promise.all([
      prisma.agency.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          company: {
            select: {
              name: true,
              rcProInsurer: true,
              rcProPolicy: true,
              rcProExpiry: true,
              guaranteeAmount: true,
              guaranteeExpiry: true,
            },
          },
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
      prisma.company.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, legalForm: true, siren: true, oriasNumber: true },
      }),
    ]);

    const agencies: AgencyDTO[] = rows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      companyId: a.companyId,
      companyName: a.company?.name ?? null,
      legalName: a.legalName,
      legalForm: a.legalForm,
      siren: a.siren,
      address: a.address,
      phone: a.phone,
      email: a.email,
      oriasNumber: a.oriasNumber,
      company: a.company
        ? {
            rcProInsurer: a.company.rcProInsurer,
            rcProPolicy: a.company.rcProPolicy,
            rcProExpiry: a.company.rcProExpiry?.toISOString() ?? null,
            guaranteeAmount: a.company.guaranteeAmount,
            guaranteeExpiry: a.company.guaranteeExpiry?.toISOString() ?? null,
          }
        : null,
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
    const companyOptions: CompanyOption[] = companies.map((c) => ({
      id: c.id,
      name: c.name,
      legalForm: c.legalForm,
      siren: c.siren,
      oriasNumber: c.oriasNumber,
    }));

    return { agencies, memberOptions, companyOptions, kpis, available: true };
  } catch {
    return {
      agencies: [],
      memberOptions: [],
      companyOptions: [],
      kpis: { actives: 0, inactives: 0, franchises: 0, filiales: 0 },
      available: false,
    };
  }
}
