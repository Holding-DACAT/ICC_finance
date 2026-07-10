"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { companyFormSchema, type CompanyFormValues } from "@/lib/validations/company";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const WRITE_ROLES = ["ADMIN", "RH"] as const;

async function canWrite(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  if (!WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false, error: "Accès refusé : réservé aux rôles RH/Admin." };
  }
  return { ok: true, userId: session.user.id };
}

function normalize(values: CompanyFormValues) {
  const amount = values.guaranteeAmount ? Number.parseInt(values.guaranteeAmount, 10) : null;
  return {
    name: values.name,
    legalForm: values.legalForm || null,
    siren: values.siren || null,
    oriasNumber: values.oriasNumber || null,
    address: values.address || null,
    phone: values.phone || null,
    email: values.email || null,
    rcProInsurer: values.rcProInsurer || null,
    rcProPolicy: values.rcProPolicy || null,
    rcProExpiry: values.rcProExpiry ? new Date(values.rcProExpiry) : null,
    guaranteeAmount: amount !== null && !Number.isNaN(amount) ? amount : null,
    guaranteeExpiry: values.guaranteeExpiry ? new Date(values.guaranteeExpiry) : null,
    sharePointUrl: values.sharePointUrl || null,
  };
}

/**
 * Répercute sur les agences rattachées la copie dénormalisée des informations
 * juridiques de la société (raison sociale, forme, SIREN, ORIAS) afin que les
 * fiches d'agence restent cohérentes après une modification de la société.
 */
async function syncAgencies(companyId: string, data: ReturnType<typeof normalize>) {
  await prisma.agency.updateMany({
    where: { companyId },
    data: {
      legalName: data.name,
      legalForm: data.legalForm,
      siren: data.siren,
      oriasNumber: data.oriasNumber,
    },
  });
}

export async function createCompany(values: CompanyFormValues): Promise<ActionResult> {
  const auth0 = await canWrite();
  if (!auth0.ok) return { ok: false, error: auth0.error };

  const parsed = companyFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const data = normalize(parsed.data);

  try {
    const company = await prisma.company.create({
      data: {
        ...data,
        directors: { create: parsed.data.directorIds.map((memberId) => ({ memberId })) },
      },
    });
    await writeAudit({
      userId: auth0.userId,
      action: "CREATE",
      entity: "Company",
      entityId: company.id,
      diff: { created: { name: company.name } },
    });
    revalidatePath("/societe");
    revalidatePath("/agences");
    return { ok: true, id: company.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "Une société avec cette raison sociale existe déjà." };
    }
    return { ok: false, error: "Échec de la création de la société." };
  }
}

export async function updateCompany(id: string, values: CompanyFormValues): Promise<ActionResult> {
  const auth0 = await canWrite();
  if (!auth0.ok) return { ok: false, error: auth0.error };

  const parsed = companyFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const data = normalize(parsed.data);

  try {
    // Remplace l'ensemble des directeurs (association N-N) de façon atomique.
    await prisma.$transaction([
      prisma.companyDirector.deleteMany({ where: { companyId: id } }),
      prisma.company.update({
        where: { id },
        data: {
          ...data,
          directors: { create: parsed.data.directorIds.map((memberId) => ({ memberId })) },
        },
      }),
    ]);
    await syncAgencies(id, data);
    await writeAudit({
      userId: auth0.userId,
      action: "UPDATE",
      entity: "Company",
      entityId: id,
      diff: { after: { name: data.name } },
    });
    revalidatePath("/societe");
    revalidatePath("/agences");
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "Une société avec cette raison sociale existe déjà." };
    }
    return { ok: false, error: "Échec de la mise à jour de la société." };
  }
}
