import type { AgencyType, MemberStatus } from "@prisma/client";

export interface AgencyDTO {
  id: string;
  name: string;
  type: AgencyType;
  status: MemberStatus;
  legalName: string | null;
  legalForm: string | null;
  siren: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  oriasNumber: string | null;
  rcProInsurer: string | null;
  rcProExpiry: string | null;
  guaranteeAmount: number | null;
  guaranteeExpiry: string | null;
  sharePointUrl: string | null;
  redevanceExcluded: boolean;
  directors: { id: string; name: string }[];
  members: { id: string; name: string; functionTitle: string }[];
}

export interface MemberOption {
  id: string;
  name: string;
}

export interface AgencyKpis {
  actives: number;
  inactives: number;
  franchises: number;
  filiales: number;
}
