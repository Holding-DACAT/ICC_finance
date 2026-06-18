"use server";

import { revalidatePath } from "next/cache";
import type { OnboardingStatus, OnboardingStepStatus } from "@prisma/client";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { DONE_COLUMN_INDEX } from "@/lib/onboarding";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import { prisma } from "@/lib/prisma";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const WRITE_ROLES = ["ADMIN", "RH"] as const;

async function requireWrite(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  if (!WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false, error: "Accès refusé : réservé aux rôles RH/Admin." };
  }
  return { ok: true, userId: session.user.id };
}

/**
 * Déplace une carte d'onboarding vers une colonne du kanban.
 * La colonne cible définit l'étape « en cours » : toutes les étapes
 * précédentes sont marquées « FAIT », la cible « EN_COURS », les suivantes
 * « A_FAIRE ». La dernière colonne marque le parcours comme terminé.
 */
export async function moveOnboardingCard(
  processId: string,
  targetColumnIndex: number,
): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const process = await prisma.onboardingProcess.findUnique({
    where: { id: processId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!process) return { ok: false, error: "Onboarding introuvable." };

  const steps = process.steps;
  // Au-delà des étapes disponibles → on considère le parcours terminé.
  const isDone = targetColumnIndex >= DONE_COLUMN_INDEX || targetColumnIndex >= steps.length;
  const target = Math.max(0, Math.min(targetColumnIndex, steps.length));

  const now = new Date();
  try {
    await prisma.$transaction([
      ...steps.map((step, idx) => {
        let status: OnboardingStepStatus;
        if (isDone || idx < target) status = "FAIT";
        else if (idx === target) status = "EN_COURS";
        else status = "A_FAIRE";
        return prisma.onboardingStep.update({
          where: { id: step.id },
          data: {
            status,
            doneAt: status === "FAIT" ? (step.doneAt ?? now) : null,
            doneById: status === "FAIT" ? (step.doneById ?? access.userId ?? null) : null,
          },
        });
      }),
      prisma.onboardingProcess.update({
        where: { id: processId },
        data: {
          status: (isDone ? "TERMINE" : "EN_COURS") as OnboardingStatus,
          progress: steps.length === 0 ? 0 : Math.round((isDone ? steps.length : target) / steps.length * 100),
        },
      }),
    ]);

    await writeAudit({
      userId: access.userId,
      action: "UPDATE",
      entity: "OnboardingProcess",
      entityId: processId,
      diff: { columnIndex: targetColumnIndex, done: isDone },
    });
    revalidatePath("/onboarding");
    revalidatePath("/");
    return { ok: true, id: processId };
  } catch {
    return { ok: false, error: "Échec du déplacement de la carte." };
  }
}

/** Démarre un parcours d'onboarding pour un membre qui n'en a pas encore. */
export async function startOnboarding(memberId: string): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const existing = await prisma.onboardingProcess.findUnique({ where: { memberId } });
  if (existing) return { ok: false, error: "Ce membre a déjà un onboarding." };

  try {
    const created = await prisma.onboardingProcess.create({
      data: {
        memberId,
        status: "EN_COURS",
        progress: 0,
        assignedToId: access.userId ?? null,
        steps: {
          create: ONBOARDING_STAGES.map((label, idx) => ({
            label,
            order: idx + 1,
            status: (idx === 0 ? "EN_COURS" : "A_FAIRE") as OnboardingStepStatus,
          })),
        },
      },
    });

    await writeAudit({
      userId: access.userId,
      action: "CREATE",
      entity: "OnboardingProcess",
      entityId: created.id,
      diff: { memberId },
    });
    revalidatePath("/onboarding");
    revalidatePath("/");
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "Échec du démarrage de l'onboarding." };
  }
}
