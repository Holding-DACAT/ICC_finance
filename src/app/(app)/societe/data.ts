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
  membersCount: number;
}

export interface SocieteDTO {
  /** Clé de regroupement (raison sociale, ou nom d'agence à défaut). */
  key: string;
  legalName: string;
  legalForm: string | null;
  siren: string | null;
  phone: string | null;
  email: string | null;
  agencies: SocieteAgency[];
  membersTotal: number;
}

export interface SocieteData {
  societes: SocieteDTO[];
  kpis: { societes: number; agencies: number; members: number };
  available: boolean;
}

/**
 * Une « société » correspond à une entité juridique (raison sociale) du réseau,
 * dérivée des agences qui lui sont rattachées.
 */
export async function getSocietesData(user: SessionUser): Promise<SocieteData> {
  try {
    const where =
      user.role === "DIRECTEUR_AGENCE" && user.scopedAgencyId
        ? { id: user.scopedAgencyId }
        : {};

    const rows = await prisma.agency.findMany({
      where,
      orderBy: { legalName: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        legalName: true,
        legalForm: true,
        siren: true,
        phone: true,
        email: true,
        _count: { select: { members: true } },
      },
    });

    const byKey = new Map<string, SocieteDTO>();
    for (const a of rows) {
      const legalName = a.legalName ?? a.name;
      const key = legalName.toLowerCase();
      const existing = byKey.get(key);
      const agency: SocieteAgency = {
        id: a.id,
        name: a.name,
        type: a.type,
        // Une agence n'a que ACTIF/INACTIF (statut « en cours » réservé aux membres).
        status: a.status === "INACTIF" ? "INACTIF" : "ACTIF",
        membersCount: a._count.members,
      };
      if (existing) {
        existing.agencies.push(agency);
        existing.membersTotal += a._count.members;
        existing.legalForm ??= a.legalForm;
        existing.siren ??= a.siren;
        existing.phone ??= a.phone;
        existing.email ??= a.email;
      } else {
        byKey.set(key, {
          key,
          legalName,
          legalForm: a.legalForm,
          siren: a.siren,
          phone: a.phone,
          email: a.email,
          agencies: [agency],
          membersTotal: a._count.members,
        });
      }
    }

    const societes = Array.from(byKey.values()).sort((a, b) =>
      a.legalName.localeCompare(b.legalName, "fr"),
    );

    const kpis = {
      societes: societes.length,
      agencies: rows.length,
      members: societes.reduce((s, x) => s + x.membersTotal, 0),
    };

    return { societes, kpis, available: true };
  } catch {
    return {
      societes: [],
      kpis: { societes: 0, agencies: 0, members: 0 },
      available: false,
    };
  }
}
