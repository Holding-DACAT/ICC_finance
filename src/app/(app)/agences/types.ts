import type { AgencyType, MemberStatus } from "@prisma/client";

export interface AgencyDTO {
  id: string;
  name: string;
  type: AgencyType;
  status: MemberStatus;
  companyId: string | null;
  companyName: string | null;
  legalName: string | null;
  legalForm: string | null;
  siren: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  oriasNumber: string | null;
  /** Assurances & conformité de la société de rattachement. */
  company: {
    rcProInsurer: string | null;
    rcProPolicy: string | null;
    rcProExpiry: string | null;
    guaranteeAmount: number | null;
    guaranteeExpiry: string | null;
  } | null;
  sharePointUrl: string | null;
  redevanceExcluded: boolean;
  directors: { id: string; name: string }[];
  members: { id: string; name: string; functionTitle: string }[];
}

export interface MemberOption {
  id: string;
  name: string;
}

/** Société sélectionnable au rattachement d'une agence (avec valeurs à recopier). */
export interface CompanyOption {
  id: string;
  name: string;
  legalForm: string | null;
  siren: string | null;
  oriasNumber: string | null;
}

export interface AgencyKpis {
  actives: number;
  inactives: number;
  franchises: number;
  filiales: number;
}
