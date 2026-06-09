import type { LicenseTier } from "@prisma/client";

export type ComputerStatusValue = "ACTIF" | "A_RENOUVELER" | "EXPIRE";

export interface ComputerDTO {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  registrationDate: string;
  lastSyncDate: string | null;
  diskFreePct: number;
  licenseTier: LicenseTier | null;
  source: string | null;
  assignedMemberId: string | null;
  assignedMemberName: string | null;
  agencyName: string | null;
  status: ComputerStatusValue;
}

export interface MemberOption {
  id: string;
  name: string;
}

export interface AgencyOption {
  id: string;
  name: string;
}

export interface ComputerKpis {
  assigned: number;
  free: number;
  toRenew: number;
  expired: number;
}
