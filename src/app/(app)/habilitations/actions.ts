"use server";

import { revalidatePath } from "next/cache";

import type { HabilitationStatus } from "@prisma/client";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canAccessAgency } from "@/lib/rbac";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const WRITE_ROLES = ["ADMIN", "RH", "DIRECTEUR_AGENCE"] as const;

/**
 * Bascule le statut d'habilitation annuel d'un membre (VALIDEE / A_VALIDER).
 * Contrôle d'accès par rôle ET par périmètre d'agence ; entrée au journal d'audit.
 */
export async function setHabilitationStatus(
  memberId: string,
  status: HabilitationStatus,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };

  const { role } = session.user;
  if (!WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number])) {
    return { ok: false, error: "Accès refusé : rôle insuffisant" };
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { agencyId: true, orias: { select: { id: true } } },
  });
  if (!member) return { ok: false, error: "Membre introuvable" };
  if (!member.orias) return { ok: false, error: "Aucune habilitation pour ce membre" };
  if (!canAccessAgency(session.user, member.agencyId)) {
    return { ok: false, error: "Accès refusé : hors périmètre" };
  }

  const validated = status === "VALIDEE";
  await prisma.oriasRegistration.update({
    where: { id: member.orias.id },
    data: {
      habilitationStatus: status,
      habilitationYear: validated ? new Date().getFullYear() : null,
      habilitationValidatedAt: validated ? new Date() : null,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "Habilitation",
    entityId: member.orias.id,
    diff: { habilitationStatus: status },
  });

  revalidatePath("/habilitations");
  return { ok: true };
}
