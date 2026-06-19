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
  phone: string | null;
  birthDate: string | null;
  postalAddress: string | null;
  siren: string | null;
  legalMentions: string | null;
  contractType: ContractType;
  functionTitle: string;
  functionSub: string | null;
  network: NetworkType;
  status: MemberStatus;
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
    renewalDate: string | null;
    rcProInsurer: string | null;
    rcProPolicy: string | null;
    rcProExpiry: string | null;
    guaranteeAmount: number | null;
    guaranteeExpiry: string | null;
    assocLogin: string | null;
    assocPassword: string | null;
  } | null;
  training: { year: number; requiredHours: number; completedHours: number } | null;
  computers: { id: string; name: string; model: string; registrationDate: string }[];
  onboardingStatus: OnboardingStatus | null;
}

export interface AgencyOption {
  id: string;
  name: string;
}

export interface MemberKpis {
  actifs: number;
  inactifs: number;
  franchises: number;
  filiales: number;
}
