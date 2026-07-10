import type {
  ComplianceStatus,
  ContractType,
  MemberStatus,
  NetworkType,
  OnboardingStatus,
} from "@prisma/client";

/** DTO sérialisable d'un membre (dates en ISO) transmis aux composants client. */
export interface MemberDTO {
  id: string;
  civility: string | null;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  postalAddress: string | null;
  siren: string | null;
  legalMentions: string | null;
  contractType: ContractType;
  functionTitle: string;
  functionSub: string | null;
  network: NetworkType;
  status: MemberStatus;
  companyId: string | null;
  companyName: string | null;
  agencyId: string;
  agencyName: string;
  agencyLegalName: string | null;
  arrivalDate: string;
  departureDate: string | null;
  orias: {
    oriasNumber: string | null;
    oriasLogin: string | null;
    oriasPassword: string | null;
    categories: string[];
    status: ComplianceStatus;
    rcProInsurer: string | null;
    rcProPolicy: string | null;
    rcProExpiry: string | null;
    guaranteeAmount: number | null;
    guaranteeExpiry: string | null;
    assocMiobspLogin: string | null;
    assocMiobspPassword: string | null;
    assocMiaLogin: string | null;
    assocMiaPassword: string | null;
  } | null;
  training: { year: number; requiredHours: number; completedHours: number } | null;
  computers: { id: string; name: string; model: string; registrationDate: string }[];
  onboardingStatus: OnboardingStatus | null;
}

export interface AgencyOption {
  id: string;
  name: string;
  /** Société de rattachement de l'agence (pour dériver la société d'un membre). */
  companyId: string | null;
}

export interface CompanyOption {
  id: string;
  name: string;
}

export interface MemberKpis {
  actifs: number;
  inactifs: number;
  franchises: number;
  filiales: number;
}
