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
    birthDate: values.birthDate ? new Date(values.birthDate) : null,
    postalAddress: values.postalAddress || null,
    siren: values.siren || null,
    legalMentions: values.legalMentions || null,
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

/** true si au moins un champ d'habilitation/assurance est renseigné. */
function hasOriasInput(v: MemberFormValues): boolean {
  return Boolean(
    v.oriasNumber ||
      v.oriasLogin ||
      (v.oriasCategories && v.oriasCategories.length > 0) ||
      v.oriasRenewalDate ||
      v.rcProInsurer ||
      v.rcProPolicy ||
      v.rcProExpiry ||
      v.guaranteeAmount ||
      v.guaranteeExpiry ||
      v.assocLogin,
  );
}

/** Données d'inscription ORIAS à upserter (les mots de passe ne sont jamais touchés ici). */
function normalizeOrias(v: MemberFormValues) {
  return {
    oriasNumber: v.oriasNumber || null,
    oriasLogin: v.oriasLogin || null,
    categories: v.oriasCategories ?? [],
    renewalDate: v.oriasRenewalDate ? new Date(v.oriasRenewalDate) : null,
    status: v.complianceStatus ?? "A_JOUR",
    rcProInsurer: v.rcProInsurer || null,
    rcProPolicy: v.rcProPolicy || null,
    rcProExpiry: v.rcProExpiry ? new Date(v.rcProExpiry) : null,
    guaranteeAmount: v.guaranteeAmount ? Number.parseInt(v.guaranteeAmount, 10) : null,
    guaranteeExpiry: v.guaranteeExpiry ? new Date(v.guaranteeExpiry) : null,
    assocLogin: v.assocLogin || null,
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
    if (hasOriasInput(parsed.data)) {
      await prisma.oriasRegistration.create({
        data: { memberId: member.id, ...normalizeOrias(parsed.data) },
      });
    }
    await startOnboarding(member.id, userId);
    await writeAudit({
      userId,
      action: "CREATE",
      entity: "Member",
      entityId: member.id,
      diff: { created: { email: member.email, agencyId: member.agencyId } },
    });
    revalidatePath("/employes");
    revalidatePath("/");
    return { ok: true, id: member.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "Un membre avec cet email existe déjà." };
    }
    return { ok: false, error: "Échec de la création du membre." };
  }
}

const FALLBACK_STEPS = ["Création AD", "Boîte mail", "Attribution PC", "Accès SharePoint"];

/** Déclenche un processus d'onboarding pour un nouveau membre (cf. lot 5). */
async function startOnboarding(memberId: string, assignedToId?: string | null): Promise<void> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "onboarding.defaultSteps" },
    });
    const labels = Array.isArray(setting?.value) ? (setting?.value as string[]) : FALLBACK_STEPS;
    // Vérifie que l'assigné est bien un compte applicatif existant (FK).
    const assignee = assignedToId
      ? await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true } })
      : null;
    await prisma.onboardingProcess.create({
      data: {
        memberId,
        status: "EN_COURS",
        progress: 0,
        assignedToId: assignee?.id ?? null,
        steps: { create: labels.map((label, idx) => ({ label, order: idx + 1 })) },
      },
    });
  } catch (error) {
    // L'onboarding ne doit pas faire échouer la création du membre.
    console.error("Échec du déclenchement de l'onboarding :", error);
  }
}

export async function updateMember(id: string, values: MemberFormValues): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  const { role, scopedAgencyId, id: userId } = session.user;

  const parsed = memberFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const existing = await prisma.member.findUnique({
    where: { id },
    include: { orias: { select: { id: true } } },
  });
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
    // Habilitation : on upserte si des champs sont fournis ou si une inscription existe déjà.
    if (hasOriasInput(parsed.data) || existing.orias) {
      const oriasData = normalizeOrias(parsed.data);
      await prisma.oriasRegistration.upsert({
        where: { memberId: id },
        update: oriasData,
        create: { memberId: id, ...oriasData },
      });
    }
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
