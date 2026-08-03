"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  OBJECTIVES_SETTING_KEY,
  getStoredObjectives,
  type StoredObjective,
} from "@/lib/pilotage";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const WRITE_ROLES = ["ADMIN", "RH"] as const;

const objectiveSchema = z.object({
  level: z.enum(["GLOBAL", "AGENCY", "COLLABORATOR"]),
  agencyId: z.string().nullable().optional(),
  collaboratorId: z.string().nullable().optional(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11).nullable().optional(),
  targetCases: z.number().int().min(0).max(100000),
  targetRevenue: z.number().int().min(0).max(1_000_000_000),
});

export type ObjectiveInput = z.infer<typeof objectiveSchema>;

async function canWrite(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };
  if (!WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false, error: "Accès refusé : réservé aux rôles RH/Admin." };
  }
  return { ok: true, userId: session.user.id };
}

function newId(): string {
  return `obj_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Crée (ou remplace) un objectif commercial, stocké dans `Setting`. */
export async function saveObjective(input: ObjectiveInput): Promise<ActionResult> {
  const auth0 = await canWrite();
  if (!auth0.ok) return { ok: false, error: auth0.error };

  const parsed = objectiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const v = parsed.data;

  const objective: StoredObjective = {
    id: newId(),
    agencyId: v.level === "AGENCY" ? v.agencyId ?? null : v.level === "COLLABORATOR" ? v.agencyId ?? null : null,
    collaboratorId: v.level === "COLLABORATOR" ? v.collaboratorId ?? null : null,
    year: v.year,
    month: v.month ?? null,
    targetCases: v.targetCases,
    targetRevenue: v.targetRevenue,
  };

  if (v.level === "AGENCY" && !objective.agencyId) {
    return { ok: false, error: "Sélectionnez une agence." };
  }
  if (v.level === "COLLABORATOR" && !objective.collaboratorId) {
    return { ok: false, error: "Sélectionnez un collaborateur." };
  }

  try {
    const existing = await getStoredObjectives();
    // Remplace un objectif de même portée + période, sinon ajoute.
    const sameScope = (o: StoredObjective) =>
      o.agencyId === objective.agencyId &&
      o.collaboratorId === objective.collaboratorId &&
      o.year === objective.year &&
      o.month === objective.month;
    const next = [...existing.filter((o) => !sameScope(o)), objective];

    await prisma.setting.upsert({
      where: { key: OBJECTIVES_SETTING_KEY },
      update: { value: next as object },
      create: { key: OBJECTIVES_SETTING_KEY, value: next as object },
    });

    await writeAudit({
      userId: auth0.userId,
      action: "CREATE",
      entity: "CommercialObjective",
      entityId: objective.id,
      diff: {
        scope: v.level,
        agencyId: objective.agencyId,
        collaboratorId: objective.collaboratorId,
        year: objective.year,
        month: objective.month,
        targetCases: objective.targetCases,
        targetRevenue: objective.targetRevenue,
      },
    });

    revalidatePath("/pilotage");
    return { ok: true };
  } catch {
    return { ok: false, error: "Échec de l'enregistrement de l'objectif." };
  }
}
