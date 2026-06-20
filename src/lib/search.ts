import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Recherche transverse du tableau de bord (équipes, sociétés, agences, ordinateurs). */

export type SearchItemType = "member" | "societe" | "agency" | "computer";

export interface SearchItem {
  id: string;
  type: SearchItemType;
  /** Texte principal affiché. */
  label: string;
  /** Texte secondaire (fonction, agence, modèle…). */
  sublabel: string;
  /** Cible de navigation. */
  href: string;
  /** Champs concaténés en minuscules pour le filtrage. */
  terms: string;
}

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

const fullName = (m: { firstName: string; lastName: string }) => `${m.lastName} ${m.firstName}`;
const norm = (parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(" ").toLowerCase();

/**
 * Construit l'index de recherche en respectant le périmètre : un directeur
 * d'agence ne voit que sa propre agence (membres, agence, postes).
 */
export async function getSearchIndex(user: SessionUser): Promise<SearchItem[]> {
  const scoped = user.role === "DIRECTEUR_AGENCE" ? user.scopedAgencyId : null;
  // Un directeur sans périmètre ne voit rien.
  if (user.role === "DIRECTEUR_AGENCE" && !scoped) return [];

  const memberWhere = scoped ? { agencyId: scoped } : {};
  const agencyWhere = scoped ? { id: scoped } : {};
  const computerWhere = scoped ? { assignedMember: { agencyId: scoped } } : {};

  try {
    const [members, agencies, computers] = await Promise.all([
      prisma.member.findMany({
        where: memberWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          functionTitle: true,
          agency: { select: { name: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.agency.findMany({
        where: agencyWhere,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          legalName: true,
          legalForm: true,
          siren: true,
          _count: { select: { members: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.computer.findMany({
        where: computerWhere,
        select: {
          id: true,
          name: true,
          model: true,
          serialNumber: true,
          assignedMember: {
            select: { firstName: true, lastName: true, agency: { select: { name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const items: SearchItem[] = [];

    for (const m of members) {
      const name = fullName(m);
      items.push({
        id: m.id,
        type: "member",
        label: name,
        sublabel: [m.functionTitle, m.agency?.name].filter(Boolean).join(" · "),
        href: `/employes?focus=${m.id}`,
        terms: norm([name, m.email, m.functionTitle, m.agency?.name]),
      });
    }

    // Sociétés = regroupement des agences par raison sociale.
    const societes = new Map<
      string,
      { legalName: string; legalForm: string | null; siren: string | null; agencies: number; members: number }
    >();
    for (const a of agencies) {
      const legalName = a.legalName ?? a.name;
      const key = legalName.toLowerCase();
      const existing = societes.get(key);
      if (existing) {
        existing.agencies += 1;
        existing.members += a._count.members;
        existing.legalForm ??= a.legalForm;
        existing.siren ??= a.siren;
      } else {
        societes.set(key, {
          legalName,
          legalForm: a.legalForm,
          siren: a.siren,
          agencies: 1,
          members: a._count.members,
        });
      }

      items.push({
        id: a.id,
        type: "agency",
        label: a.name,
        sublabel: [
          a.type === "FRANCHISE" ? "Franchise" : "Filiale",
          a.legalName,
          `${a._count.members} membre(s)`,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/agences?focus=${a.id}`,
        terms: norm([a.name, a.legalName, a.legalForm, a.siren]),
      });
    }

    for (const [key, s] of societes) {
      items.push({
        id: key,
        type: "societe",
        label: s.legalName,
        sublabel: [s.legalForm, `${s.agencies} agence(s)`, `${s.members} membre(s)`]
          .filter(Boolean)
          .join(" · "),
        href: "/societe",
        terms: norm([s.legalName, s.legalForm, s.siren]),
      });
    }

    for (const c of computers) {
      const assignedName = c.assignedMember ? fullName(c.assignedMember) : null;
      items.push({
        id: c.id,
        type: "computer",
        label: c.name,
        sublabel: [c.model, assignedName ?? "Libre", c.assignedMember?.agency?.name]
          .filter(Boolean)
          .join(" · "),
        href: `/ordinateurs?focus=${c.id}`,
        terms: norm([c.name, c.model, c.serialNumber, assignedName, c.assignedMember?.agency?.name]),
      });
    }

    return items;
  } catch {
    return [];
  }
}
