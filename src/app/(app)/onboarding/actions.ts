"use server";

import { revalidatePath } from "next/cache";
import type { OnboardingStatus, OnboardingStepStatus } from "@prisma/client";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { deriveProgress, getOnboardingStages, ONBOARDING_STAGES_SETTING_KEY } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { onboardingStagesSchema } from "@/lib/validations/onboarding";

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
  // La colonne finale (index = nombre d'étapes) marque le parcours terminé.
  const isDone = targetColumnIndex >= steps.length;
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

  const stages = await getOnboardingStages();

  try {
    const created = await prisma.onboardingProcess.create({
      data: {
        memberId,
        status: "EN_COURS",
        progress: 0,
        assignedToId: access.userId ?? null,
        steps: {
          create: stages.map((label, idx) => ({
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

/**
 * Enregistre la liste éditable des étapes du kanban et réaligne les étapes de
 * tous les onboardings existants : les positions conservées gardent leur état,
 * les nouvelles sont « à faire », les positions retirées sont supprimées.
 */
export async function saveOnboardingStages(stagesInput: string[]): Promise<ActionResult> {
  const access = await requireWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = onboardingStagesSchema.safeParse({ stages: stagesInput });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Étapes invalides." };
  }
  const stages = parsed.data.stages;

  try {
    const processes = await prisma.onboardingProcess.findMany({
      include: { steps: { orderBy: { order: "asc" } } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: ONBOARDING_STAGES_SETTING_KEY },
        update: { value: stages },
        create: { key: ONBOARDING_STAGES_SETTING_KEY, value: stages },
      });

      for (const process of processes) {
        // Mise à jour / création des étapes par position.
        for (let i = 0; i < stages.length; i++) {
          const existing = process.steps[i];
          if (existing) {
            if (existing.label !== stages[i]) {
              await tx.onboardingStep.update({
                where: { id: existing.id },
                data: { label: stages[i] },
              });
            }
          } else {
            await tx.onboardingStep.create({
              data: { processId: process.id, label: stages[i], order: i + 1, status: "A_FAIRE" },
            });
          }
        }
        // Suppression des étapes au-delà de la nouvelle longueur.
        const surplus = process.steps.slice(stages.length);
        if (surplus.length > 0) {
          await tx.onboardingStep.deleteMany({
            where: { id: { in: surplus.map((s) => s.id) } },
          });
        }
        // Recalcule le statut/avancement sur les étapes conservées.
        const remaining = process.steps.slice(0, stages.length);
        const { status, progress } = deriveProgress(remaining);
        await tx.onboardingProcess.update({
          where: { id: process.id },
          data: { status, progress },
        });
      }
    });

    await writeAudit({
      userId: access.userId,
      action: "UPDATE",
      entity: "Setting",
      entityId: ONBOARDING_STAGES_SETTING_KEY,
      diff: { stages },
    });
    revalidatePath("/onboarding");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Échec de l'enregistrement des étapes." };
  }
}
