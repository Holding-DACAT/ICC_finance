import { z } from "zod";

/** Schémas Zod — frontière de validation des formulaires/API (cf. CLAUDE.md §3). */

export const contractTypes = ["CDI", "CDD", "MANDAT", "FRANCHISE"] as const;
export const networkTypes = ["FRANCHISE", "FILIALE", "AFFILIE"] as const;
export const memberStatuses = ["ACTIF", "INACTIF", "EN_COURS_ENREGISTREMENT"] as const;
export const oriasCategories = [
  "COBSP",
  "MOBSP",
  "MIOBSP",
  "COA",
  "MIAS",
  "MIA",
  "CIF",
  "IFP",
] as const;
export const complianceStatuses = ["A_JOUR", "A_RENOUVELER", "EXPIRE"] as const;

export const memberFormSchema = z.object({
  civility: z.string().trim().max(10).optional().or(z.literal("")),
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  postalAddress: z.string().trim().max(240).optional().or(z.literal("")),
  siren: z.string().trim().max(20).optional().or(z.literal("")),
  legalMentions: z.string().trim().max(500).optional().or(z.literal("")),
  contractType: z.enum(contractTypes, { message: "Type de contrat requis" }),
  functionTitle: z.string().trim().min(1, "Fonction requise").max(120),
  functionSub: z.string().trim().max(160).optional().or(z.literal("")),
  network: z.enum(networkTypes, { message: "Réseau requis" }),
  status: z.enum(memberStatuses).default("ACTIF"),
  agencyId: z.string().min(1, "Agence requise"),
  arrivalDate: z.string().min(1, "Date d'arrivée requise"),
  departureDate: z.string().optional().or(z.literal("")),

  // --- Habilitation ORIAS & assurances (optionnel) ---
  // Les mots de passe (ORIAS/associations) ne sont volontairement pas éditables
  // ici : on n'expose pas de secret en clair dans les formulaires (cf. CLAUDE.md §4).
  oriasNumber: z.string().trim().max(40).optional().or(z.literal("")),
  oriasLogin: z.string().trim().max(120).optional().or(z.literal("")),
  oriasCategories: z.array(z.enum(oriasCategories)).default([]),
  oriasRenewalDate: z.string().optional().or(z.literal("")),
  complianceStatus: z.enum(complianceStatuses).default("A_JOUR"),
  rcProInsurer: z.string().trim().max(120).optional().or(z.literal("")),
  rcProPolicy: z.string().trim().max(120).optional().or(z.literal("")),
  rcProExpiry: z.string().optional().or(z.literal("")),
  guaranteeAmount: z
    .string()
    .trim()
    .regex(/^\d*$/, "Montant invalide (entier en euros).")
    .optional()
    .or(z.literal("")),
  guaranteeExpiry: z.string().optional().or(z.literal("")),
  assocLogin: z.string().trim().max(120).optional().or(z.literal("")),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
