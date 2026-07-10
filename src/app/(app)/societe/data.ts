import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

export interface SocieteAgency {
  id: string;
  name: string;
  type: "FRANCHISE" | "FILIALE";
  status: "ACTIF" | "INACTIF";
  /** Nombre total de membres rattachés (tous statuts). */
  membersCount: number;
  /** Nombre de membres actifs. */
  membersActiveCount: number;
}

export interface SocieteDTO {
  id: string;
  /** Raison sociale. */
  name: string;
  legalForm: string | null;
  siren: string | null;
  oriasNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  rcProInsurer: string | null;
  rcProPolicy: string | null;
  rcProExpiry: string | null;
  guaranteeAmount: number | null;
  guaranteeExpiry: string | null;
  sharePointUrl: string | null;
  status: "ACTIF" | "INACTIF";
  directors: { id: string; name: string }[];
  agencies: SocieteAgency[];
  membersTotal: number;
  membersActiveTotal: number;
}

export interface MemberOption {
  id: string;
  name: string;
}

export interface SocieteData {
  societes: SocieteDTO[];
  memberOptions: MemberOption[];
  kpis: { societes: number; agencies: number; members: number };
  available: boolean;
}

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

/**
 * Une « société » est une entité juridique (raison sociale) du réseau. Elle
 * porte la forme juridique, le SIREN, l'ORIAS, la RC Pro et la garantie
 * financière, et regroupe une ou plusieurs agences.
 */
export async function getSocietesData(user: SessionUser): Promise<SocieteData> {
  try {
    // Un directeur d'agence ne voit que la société de son agence.
    const where =
      user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId
        ? { agencies: { some: { id: user.scopedAgencyId } } }
        : {};

    const [rows, members] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          directors: {
            include: { member: { select: { id: true, firstName: true, lastName: true } } },
          },
          agencies: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              members: { select: { status: true } },
            },
          },
        },
      }),
      prisma.member.findMany({
        orderBy: { lastName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    const societes: SocieteDTO[] = rows.map((c) => {
      const agencies: SocieteAgency[] = c.agencies.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        status: a.status === "INACTIF" ? "INACTIF" : "ACTIF",
        membersCount: a.members.length,
        membersActiveCount: a.members.filter((m) => m.status === "ACTIF").length,
      }));
      const membersTotal = agencies.reduce((s, a) => s + a.membersCount, 0);
      const membersActiveTotal = agencies.reduce((s, a) => s + a.membersActiveCount, 0);
      // Actif si au moins une agence est active ; sinon repli sur le statut propre
      // de la société (utile tant qu'aucune agence n'y est encore rattachée).
      const active = agencies.length
        ? agencies.some((a) => a.status === "ACTIF")
        : c.status !== "INACTIF";
      return {
        id: c.id,
        name: c.name,
        legalForm: c.legalForm,
        siren: c.siren,
        oriasNumber: c.oriasNumber,
        address: c.address,
        phone: c.phone,
        email: c.email,
        rcProInsurer: c.rcProInsurer,
        rcProPolicy: c.rcProPolicy,
        rcProExpiry: c.rcProExpiry?.toISOString() ?? null,
        guaranteeAmount: c.guaranteeAmount,
        guaranteeExpiry: c.guaranteeExpiry?.toISOString() ?? null,
        sharePointUrl: c.sharePointUrl,
        status: active ? "ACTIF" : "INACTIF",
        directors: c.directors.map((d) => ({ id: d.member.id, name: memberName(d.member) })),
        agencies,
        membersTotal,
        membersActiveTotal,
      };
    });

    const kpis = {
      societes: societes.length,
      agencies: societes.reduce((s, x) => s + x.agencies.length, 0),
      members: societes.reduce((s, x) => s + x.membersTotal, 0),
    };

    const memberOptions: MemberOption[] = members.map((m) => ({ id: m.id, name: memberName(m) }));

    return { societes, memberOptions, kpis, available: true };
  } catch {
    return {
      societes: [],
      memberOptions: [],
      kpis: { societes: 0, agencies: 0, members: 0 },
      available: false,
    };
  }
}
