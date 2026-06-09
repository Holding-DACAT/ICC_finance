"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canAccessAgency } from "@/lib/rbac";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const WRITE_ROLES = ["ADMIN", "RH"] as const;

function normalize(values: MemberFormValues) {
  return {
    civility: values.civility || null,
    firstName: values.firstName,
    lastName: values.lastName.toUpperCase(),
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    contractType: values.contractType,
    functionTitle: values.functionTitle,
    functionSub: values.functionSub || null,
    network: values.network,
    status: values.status,
    agencyId: values.agencyId,
    arrivalDate: new Date(values.arrivalDate),
    departureDate: values.departureDate ? new Date(values.departureDate) : null,
  };
}

export async function createMember(values: MemberFormValues): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  const { role, scopedAgencyId, id: userId } = session.user;

  const parsed = memberFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  // Contrôle d'accès : RH/ADMIN partout ; un directeur uniquement sur son agence.
  const data = normalize(parsed.data);
  const allowed =
    WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number]) ||
    (role === "DIRECTEUR_AGENCE" && canAccessAgency({ role, scopedAgencyId }, data.agencyId));
  if (!allowed) return { ok: false, error: "Accès refusé." };

  try {
    const member = await prisma.member.create({ data });
    await writeAudit({
      userId,
      action: "CREATE",
      entity: "Member",
      entityId: member.id,
      diff: { created: { email: member.email, agencyId: member.agencyId } },
    });
    revalidatePath("/employes");
    return { ok: true, id: member.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "Un membre avec cet email existe déjà." };
    }
    return { ok: false, error: "Échec de la création du membre." };
  }
}

export async function updateMember(
  id: string,
  values: MemberFormValues,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  const { role, scopedAgencyId, id: userId } = session.user;

  const parsed = memberFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Membre introuvable." };

  const data = normalize(parsed.data);
  const allowed =
    WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number]) ||
    (role === "DIRECTEUR_AGENCE" &&
      canAccessAgency({ role, scopedAgencyId }, existing.agencyId) &&
      canAccessAgency({ role, scopedAgencyId }, data.agencyId));
  if (!allowed) return { ok: false, error: "Accès refusé." };

  try {
    await prisma.member.update({ where: { id }, data });
    await writeAudit({
      userId,
      action: "UPDATE",
      entity: "Member",
      entityId: id,
      diff: {
        before: { status: existing.status, agencyId: existing.agencyId },
        after: { status: data.status, agencyId: data.agencyId },
      },
    });
    revalidatePath("/employes");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Échec de la mise à jour du membre." };
  }
}
