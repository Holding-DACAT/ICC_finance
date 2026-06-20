import { prisma } from "@/lib/prisma";
import { ONBOARDING_DONE_LABEL, ONBOARDING_STAGES } from "@/lib/onboarding-stages";

/** Clé du paramètre stockant la liste éditable des étapes du kanban. */
export const ONBOARDING_STAGES_SETTING_KEY = "onboarding.defaultSteps";

/** Carte du kanban : un collaborateur en cours d'intégration. */
export interface OnboardingCard {
  id: string; // identifiant du processus d'onboarding
  memberId: string;
  firstName: string;
  lastName: string;
  active: boolean;
  functionTitle: string;
  agencyName: string | null;
  arrivalDate: string;
  assignedTo: string;
  doneSteps: number;
  totalSteps: number;
  /** Index de la colonne où placer la carte (0..columns.length-1). */
  columnIndex: number;
}

export interface OnboardingBoard {
  available: boolean;
  /** Étapes éditables (sans la colonne finale dérivée). */
  stages: string[];
  /** Libellés des colonnes : étapes + colonne finale dérivée. */
  columns: string[];
  cards: OnboardingCard[];
  /** Agences disponibles pour la création d'un nouveau collaborateur. */
  agencies: { id: string; name: string }[];
}

/**
 * Liste éditable des étapes du kanban, lue depuis le paramètre
 * `onboarding.defaultSteps` (repli sur la constante par défaut).
 */
export async function getOnboardingStages(): Promise<string[]> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: ONBOARDING_STAGES_SETTING_KEY },
    });
    const value = setting?.value;
    if (Array.isArray(value)) {
      const labels = value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
      if (labels.length > 0) return labels;
    }
  } catch {
    // repli ci-dessous
  }
  return [...ONBOARDING_STAGES];
}

/** Colonnes du kanban = étapes paramétrées + colonne finale dérivée. */
export function buildColumns(stages: string[]): string[] {
  return [...stages, ONBOARDING_DONE_LABEL];
}

/**
 * Détermine la colonne d'une carte à partir de l'état de ses étapes.
 * - Toutes les étapes réalisées → colonne finale (index = nombre d'étapes).
 * - Sinon → première étape non terminée.
 */
export function columnIndexFor(steps: { status: string }[]): number {
  if (steps.length === 0) return 0;
  const firstPending = steps.findIndex((s) => s.status !== "FAIT");
  return firstPending === -1 ? steps.length : firstPending;
}

/**
 * Recalcule le statut/avancement d'un processus d'après l'état de ses étapes.
 * Pur (sans accès base) afin d'être testable et réutilisable.
 */
export function deriveProgress(steps: { status: string }[]): {
  status: "AUCUN" | "EN_COURS" | "TERMINE";
  progress: number;
} {
  if (steps.length === 0) return { status: "AUCUN", progress: 0 };
  const done = steps.filter((s) => s.status === "FAIT").length;
  const status = done === steps.length ? "TERMINE" : done === 0 ? "AUCUN" : "EN_COURS";
  return { status, progress: Math.round((done / steps.length) * 100) };
}

export async function getOnboardingBoard(): Promise<OnboardingBoard> {
  try {
    const stages = await getOnboardingStages();
    const [processes, agencies] = await Promise.all([
      prisma.onboardingProcess.findMany({
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              functionTitle: true,
              arrivalDate: true,
              agency: { select: { name: true } },
            },
          },
          assignedTo: { select: { name: true, email: true } },
          steps: { orderBy: { order: "asc" }, select: { status: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.agency.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const cards: OnboardingCard[] = processes.map((p) => ({
      id: p.id,
      memberId: p.member.id,
      firstName: p.member.firstName,
      lastName: p.member.lastName,
      active: p.member.status === "ACTIF",
      functionTitle: p.member.functionTitle,
      agencyName: p.member.agency?.name ?? null,
      arrivalDate: p.member.arrivalDate.toISOString(),
      assignedTo: p.assignedTo?.name ?? p.assignedTo?.email ?? "—",
      doneSteps: p.steps.filter((s) => s.status === "FAIT").length,
      totalSteps: p.steps.length,
      columnIndex: columnIndexFor(p.steps),
    }));

    return {
      available: true,
      stages,
      columns: buildColumns(stages),
      cards,
      agencies,
    };
  } catch {
    const fallback = [...ONBOARDING_STAGES];
    return {
      available: false,
      stages: fallback,
      columns: buildColumns(fallback),
      cards: [],
      agencies: [],
    };
  }
}
