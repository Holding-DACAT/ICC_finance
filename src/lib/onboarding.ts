import { prisma } from "@/lib/prisma";
import { ONBOARDING_DONE_LABEL, ONBOARDING_STAGES } from "@/lib/onboarding-stages";

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
  /** Libellés des colonnes : étapes + colonne finale dérivée. */
  columns: string[];
  cards: OnboardingCard[];
  /** Membres actifs sans onboarding (candidats au démarrage d'un parcours). */
  eligibleMembers: { id: string; name: string }[];
}

/** Colonnes du kanban : les étapes paramétrées + la colonne finale dérivée. */
export const ONBOARDING_COLUMNS: string[] = [...ONBOARDING_STAGES, ONBOARDING_DONE_LABEL];

/** Index de la colonne « Intégration terminée ». */
export const DONE_COLUMN_INDEX = ONBOARDING_STAGES.length;

const fullName = (m: { firstName: string; lastName: string }) => `${m.lastName} ${m.firstName}`;

/**
 * Détermine la colonne d'une carte à partir de l'état de ses étapes.
 * - Toutes les étapes réalisées → colonne finale.
 * - Sinon → première étape non terminée (bornée au nombre de colonnes).
 */
function columnIndexFor(steps: { status: string }[]): number {
  if (steps.length === 0) return 0;
  const firstPending = steps.findIndex((s) => s.status !== "FAIT");
  if (firstPending === -1) return DONE_COLUMN_INDEX;
  return Math.min(firstPending, DONE_COLUMN_INDEX);
}

export async function getOnboardingBoard(): Promise<OnboardingBoard> {
  try {
    const [processes, membersWithout] = await Promise.all([
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
      prisma.member.findMany({
        where: { status: "ACTIF", onboarding: { is: null } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
      columns: ONBOARDING_COLUMNS,
      cards,
      eligibleMembers: membersWithout.map((m) => ({ id: m.id, name: fullName(m) })),
    };
  } catch {
    return { available: false, columns: ONBOARDING_COLUMNS, cards: [], eligibleMembers: [] };
  }
}
