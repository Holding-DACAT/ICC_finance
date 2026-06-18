"use server";

import { revalidatePath } from "next/cache";
import type { LicenseTier, Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { computerFormSchema, type ComputerFormValues } from "@/lib/validations/computer";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  count?: number;
}

const WRITE_ROLES = ["ADMIN", "IT"] as const;

function normalize(values: ReturnType<typeof computerFormSchema.parse>) {
  return {
    name: values.name,
    model: values.model,
    serialNumber: values.serialNumber,
    registrationDate: new Date(values.registrationDate),
    lastSyncDate: values.lastSyncDate ? new Date(values.lastSyncDate) : null,
    diskFreePct: values.diskFreePct ? Math.round(Number(values.diskFreePct)) : 0,
    licenseTier: values.licenseTier ? (values.licenseTier as LicenseTier) : null,
    source: values.source || "manuel",
    assignedMemberId: values.assignedMemberId || null,
  };
}

async function requireWrite(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  if (!WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false, error: "Accès refusé : réservé aux rôles IT/Admin." };
  }
  return { ok: true, userId: session.user.id };
}

export async function createComputer(values: ComputerFormValues): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = computerFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const computer = await prisma.computer.create({ data: normalize(parsed.data) });
    await writeAudit({
      userId: access.userId,
      action: "CREATE",
      entity: "Computer",
      entityId: computer.id,
      diff: { created: { name: computer.name, serialNumber: computer.serialNumber } },
    });
    revalidatePath("/ordinateurs");
    return { ok: true, id: computer.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "Un poste avec ce nom ou ce n° de série existe déjà." };
    }
    return { ok: false, error: "Échec de la création du poste." };
  }
}

export async function updateComputer(
  id: string,
  values: ComputerFormValues,
): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = computerFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await prisma.computer.update({ where: { id }, data: normalize(parsed.data) });
    await writeAudit({ userId: access.userId, action: "UPDATE", entity: "Computer", entityId: id });
    revalidatePath("/ordinateurs");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Échec de la mise à jour du poste." };
  }
}

/** Attribution / désattribution rapide d'un poste à un membre. */
export async function assignComputer(
  id: string,
  memberId: string | null,
): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };

  try {
    await prisma.computer.update({ where: { id }, data: { assignedMemberId: memberId } });
    await writeAudit({
      userId: access.userId,
      action: "UPDATE",
      entity: "Computer",
      entityId: id,
      diff: { assignedMemberId: memberId },
    });
    revalidatePath("/ordinateurs");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Échec de l'attribution." };
  }
}

export interface BulkComputerPatch {
  licenseTier?: LicenseTier;
  /** Absent = ne pas toucher ; null = libérer ; id = attribuer. */
  assignedMemberId?: string | null;
}

/** Modification groupée de postes (licence / attribution). Réservé IT/Admin. */
export async function bulkUpdateComputers(
  ids: string[],
  patch: BulkComputerPatch,
): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Aucune ligne sélectionnée." };
  }

  const data: BulkComputerPatch = {};
  if (patch.licenseTier === "SILVER" || patch.licenseTier === "GOLD") {
    data.licenseTier = patch.licenseTier;
  }
  if ("assignedMemberId" in patch) data.assignedMemberId = patch.assignedMemberId ?? null;
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Aucune modification indiquée." };
  }

  try {
    const res = await prisma.computer.updateMany({ where: { id: { in: ids } }, data });
    await writeAudit({
      userId: access.userId,
      action: "UPDATE",
      entity: "Computer",
      diff: { bulk: { count: res.count, patch: data } } as unknown as Prisma.InputJsonValue,
    });
    revalidatePath("/ordinateurs");
    return { ok: true, count: res.count };
  } catch {
    return { ok: false, error: "Échec de la modification groupée." };
  }
}
