"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  agencyFormSchema,
  agencyStatuses,
  agencyTypes,
  type AgencyFormValues,
} from "@/lib/validations/agency";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const WRITE_ROLES = ["ADMIN", "RH"] as const;

/**
 * Champs propres de l'agence. La forme juridique / SIREN / ORIAS / raison
 * sociale sont recopiés depuis la société de rattachement (cf. `withCompany`).
 */
function normalize(values: AgencyFormValues) {
  return {
    name: values.name,
    type: values.type,
    status: values.status,
    companyId: values.companyId || null,
    address: values.address || null,
    phone: values.phone || null,
    email: values.email || null,
    sharePointUrl: values.sharePointUrl || null,
    redevanceExcluded: values.redevanceExcluded,
  };
}

/**
 * Complète les données de l'agence avec la copie dénormalisée des informations
 * juridiques de la société de rattachement (raison sociale, forme, SIREN, ORIAS).
 */
async function withCompany(data: ReturnType<typeof normalize>) {
  if (!data.companyId) {
    return { ...data, legalName: null, legalForm: null, siren: null, oriasNumber: null };
  }
  const company = await prisma.company.findUnique({
    where: { id: data.companyId },
    select: { name: true, legalForm: true, siren: true, oriasNumber: true },
  });
  return {
    ...data,
    legalName: company?.name ?? null,
    legalForm: company?.legalForm ?? null,
    siren: company?.siren ?? null,
    oriasNumber: company?.oriasNumber ?? null,
  };
}

async function canWrite(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  if (!WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false, error: "Accès refusé : réservé aux rôles RH/Admin." };
  }
  return { ok: true, userId: session.user.id };
}

export async function createAgency(values: AgencyFormValues): Promise<ActionResult> {
  const auth0 = await canWrite();
  if (!auth0.ok) return { ok: false, error: auth0.error };

  const parsed = agencyFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const data = await withCompany(normalize(parsed.data));

  try {
    const agency = await prisma.agency.create({
      data: {
        ...data,
        directors: {
          create: parsed.data.directorIds.map((memberId) => ({ memberId })),
        },
      },
    });
    await writeAudit({
      userId: auth0.userId,
      action: "CREATE",
      entity: "Agency",
      entityId: agency.id,
      diff: { created: { name: agency.name, type: agency.type } },
    });
    revalidatePath("/agences");
    return { ok: true, id: agency.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "Une agence avec ce nom existe déjà." };
    }
    return { ok: false, error: "Échec de la création de l'agence." };
  }
}

export async function updateAgency(id: string, values: AgencyFormValues): Promise<ActionResult> {
  const auth0 = await canWrite();
  if (!auth0.ok) return { ok: false, error: auth0.error };

  const parsed = agencyFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const data = await withCompany(normalize(parsed.data));

  try {
    // Remplace l'ensemble des directeurs (association N-N) de façon atomique.
    await prisma.$transaction([
      prisma.agencyDirector.deleteMany({ where: { agencyId: id } }),
      prisma.agency.update({
        where: { id },
        data: {
          ...data,
          directors: { create: parsed.data.directorIds.map((memberId) => ({ memberId })) },
        },
      }),
    ]);
    await writeAudit({
      userId: auth0.userId,
      action: "UPDATE",
      entity: "Agency",
      entityId: id,
      diff: { after: { name: data.name, status: data.status } },
    });
    revalidatePath("/agences");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Échec de la mise à jour de l'agence." };
  }
}

export interface BulkAgencyPatch {
  status?: (typeof agencyStatuses)[number];
  type?: (typeof agencyTypes)[number];
}

/** Modification groupée d'agences (statut / type). Réservé RH/Admin. */
export async function bulkUpdateAgencies(
  ids: string[],
  patch: BulkAgencyPatch,
): Promise<ActionResult & { count?: number }> {
  const auth0 = await canWrite();
  if (!auth0.ok) return auth0;
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Aucune ligne sélectionnée." };
  }

  const data: BulkAgencyPatch = {};
  if (patch.status && agencyStatuses.includes(patch.status)) data.status = patch.status;
  if (patch.type && agencyTypes.includes(patch.type)) data.type = patch.type;
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Aucune modification indiquée." };
  }

  try {
    const res = await prisma.agency.updateMany({ where: { id: { in: ids } }, data });
    await writeAudit({
      userId: auth0.userId,
      action: "UPDATE",
      entity: "Agency",
      diff: { bulk: { count: res.count, patch: data } } as unknown as Prisma.InputJsonValue,
    });
    revalidatePath("/agences");
    return { ok: true, count: res.count };
  } catch {
    return { ok: false, error: "Échec de la modification groupée." };
  }
}

/**
 * Active/désactive une ou plusieurs agences avec répercussion sur les équipes.
 *
 * - Désactivation : les agences passent INACTIF et **tous** leurs membres aussi.
 * - Activation : les agences repassent ACTIF et seuls les membres précédemment
 *   inactifs et non partis (sans `departureDate`) sont réactivés, afin de ne pas
 *   « ressusciter » d'anciens collaborateurs.
 *
 * Utilisé par le bouton actif/inactif des agences ET des sociétés (qui transmet
 * la liste des agences de l'entité juridique).
 */
export async function setAgenciesActive(
  agencyIds: string[],
  active: boolean,
): Promise<ActionResult & { agencies?: number; members?: number }> {
  const auth0 = await canWrite();
  if (!auth0.ok) return { ok: false, error: auth0.error };
  if (!Array.isArray(agencyIds) || agencyIds.length === 0) {
    return { ok: false, error: "Aucune agence ciblée." };
  }

  const status = active ? "ACTIF" : "INACTIF";
  try {
    const result = await prisma.$transaction(async (tx) => {
      const agencies = await tx.agency.updateMany({
        where: { id: { in: agencyIds } },
        data: { status },
      });
      const members = active
        ? await tx.member.updateMany({
            where: { agencyId: { in: agencyIds }, status: "INACTIF", departureDate: null },
            data: { status: "ACTIF" },
          })
        : await tx.member.updateMany({
            where: { agencyId: { in: agencyIds } },
            data: { status: "INACTIF" },
          });
      return { agencies: agencies.count, members: members.count };
    });

    await writeAudit({
      userId: auth0.userId,
      action: "UPDATE",
      entity: "Agency",
      diff: {
        statusCascade: { status, agencyIds, agencies: result.agencies, members: result.members },
      } as unknown as Prisma.InputJsonValue,
    });

    revalidatePath("/agences");
    revalidatePath("/societe");
    revalidatePath("/employes");
    revalidatePath("/");
    return { ok: true, agencies: result.agencies, members: result.members };
  } catch {
    return { ok: false, error: "Échec du changement de statut." };
  }
}
