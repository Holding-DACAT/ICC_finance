import { computeComputerStatus } from "@/lib/computer";
import { prisma } from "@/lib/prisma";

export interface RecruitmentBucket {
  label: string;
  count: number;
}

export interface LastComputer {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  registrationDate: string;
  assignedMemberName: string | null;
}

export interface OnboardingRow {
  id: string;
  memberName: string;
  status: string;
  progress: number;
  totalSteps: number;
  doneSteps: number;
  lastStep: string;
  nextStep: string;
  assignedTo: string;
  updatedAt: string;
}

export interface DashboardData {
  available: boolean;
  membersTotal: number;
  membersActive: number;
  iccDevMembers: number;
  agenciesFranchise: number;
  agenciesFiliale: number;
  computersTotal: number;
  computersExpiringSoon: number;
  oriasAlerts: number;
  oriasUpToDate: number;
  recruitments: RecruitmentBucket[];
  totalRecruitments: number;
  lastComputers: LastComputer[];
  onboardings: OnboardingRow[];
}

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const memberName = (m: { lastName: string; firstName: string }) => `${m.lastName} ${m.firstName}`;

function emptyData(): DashboardData {
  return {
    available: false,
    membersTotal: 0,
    membersActive: 0,
    iccDevMembers: 0,
    agenciesFranchise: 0,
    agenciesFiliale: 0,
    computersTotal: 0,
    computersExpiringSoon: 0,
    oriasAlerts: 0,
    oriasUpToDate: 0,
    recruitments: [],
    totalRecruitments: 0,
    lastComputers: [],
    onboardings: [],
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [members, agencies, computers, orias, onboardings, iccDev] = await Promise.all([
      prisma.member.findMany({ select: { status: true, arrivalDate: true } }),
      prisma.agency.findMany({ select: { type: true } }),
      prisma.computer.findMany({
        select: {
          id: true,
          name: true,
          model: true,
          serialNumber: true,
          registrationDate: true,
          assignedMember: { select: { firstName: true, lastName: true } },
        },
        orderBy: { registrationDate: "desc" },
      }),
      prisma.oriasRegistration.findMany({ select: { status: true } }),
      prisma.onboardingProcess.findMany({
        include: {
          member: { select: { firstName: true, lastName: true } },
          assignedTo: { select: { name: true, email: true } },
          steps: { orderBy: { order: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.agency.findFirst({
        where: { name: "ICC Développement" },
        select: { _count: { select: { members: true } } },
      }),
    ]);

    // Recrutements sur 6 mois glissants.
    const now = new Date();
    const buckets: RecruitmentBucket[] = [];
    const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
    const counts = new Map<string, number>();
    for (const m of members) {
      counts.set(keyOf(m.arrivalDate), (counts.get(keyOf(m.arrivalDate)) ?? 0) + 1);
    }
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: MONTHS_FR[d.getMonth()], count: counts.get(keyOf(d)) ?? 0 });
    }

    const lastComputers: LastComputer[] = computers.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      model: c.model,
      serialNumber: c.serialNumber,
      registrationDate: c.registrationDate.toISOString(),
      assignedMemberName: c.assignedMember ? memberName(c.assignedMember) : null,
    }));

    const onboardingRows: OnboardingRow[] = onboardings.map((o) => {
      const done = o.steps.filter((s) => s.status === "FAIT");
      const next = o.steps.find((s) => s.status !== "FAIT");
      return {
        id: o.id,
        memberName: memberName(o.member),
        status: o.status,
        progress: o.progress,
        totalSteps: o.steps.length,
        doneSteps: done.length,
        lastStep: done.at(-1)?.label ?? "—",
        nextStep: next?.label ?? "Aucune",
        assignedTo: o.assignedTo?.name ?? o.assignedTo?.email ?? "—",
        updatedAt: o.updatedAt.toISOString(),
      };
    });

    return {
      available: true,
      membersTotal: members.length,
      membersActive: members.filter((m) => m.status === "ACTIF").length,
      iccDevMembers: iccDev?._count.members ?? 0,
      agenciesFranchise: agencies.filter((a) => a.type === "FRANCHISE").length,
      agenciesFiliale: agencies.filter((a) => a.type === "FILIALE").length,
      computersTotal: computers.length,
      computersExpiringSoon: computers.filter(
        (c) => computeComputerStatus(c.registrationDate) !== "ACTIF",
      ).length,
      oriasAlerts: orias.filter((o) => o.status !== "A_JOUR").length,
      oriasUpToDate: orias.filter((o) => o.status === "A_JOUR").length,
      recruitments: buckets,
      totalRecruitments: buckets.reduce((s, b) => s + b.count, 0),
      lastComputers,
      onboardings: onboardingRows,
    };
  } catch {
    return emptyData();
  }
}
