"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { agencyFormSchema, type AgencyFormValues } from "@/lib/validations/agency";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const WRITE_ROLES = ["ADMIN", "RH"] as const;

function normalize(values: AgencyFormValues) {
  const amount = values.guaranteeAmount ? Number(values.guaranteeAmount) : null;
  return {
    name: values.name,
    type: values.type,
    status: values.status,
    legalName: values.legalName || null,
    legalForm: values.legalForm || null,
    address: values.address || null,
    oriasNumber: values.oriasNumber || null,
    rcProInsurer: values.rcProInsurer || null,
    rcProExpiry: values.rcProExpiry ? new Date(values.rcProExpiry) : null,
    guaranteeAmount: amount !== null && !Number.isNaN(amount) ? Math.round(amount) : null,
    guaranteeExpiry: values.guaranteeExpiry ? new Date(values.guaranteeExpiry) : null,
    sharePointUrl: values.sharePointUrl || null,
    redevanceExcluded: values.redevanceExcluded,
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
  const data = normalize(parsed.data);

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
  const data = normalize(parsed.data);

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
