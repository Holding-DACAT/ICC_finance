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

// Photo : URL http(s) ou data URL (image encodée). Plafonnée pour éviter de
// stocker des images trop lourdes en base (l'upload est redimensionné côté client).
const MAX_PHOTO_LENGTH = 700_000; // ~500 Ko en base64

export const memberFormSchema = z.object({
  civility: z.string().trim().max(10).optional().or(z.literal("")),
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(160),
  personalEmail: z
    .string()
    .trim()
    .max(160)
    .email("Email personnel invalide")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  photoUrl: z
    .string()
    .trim()
    .max(MAX_PHOTO_LENGTH, "Photo trop volumineuse (max ~500 Ko).")
    .optional()
    .or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  postalAddress: z.string().trim().max(240).optional().or(z.literal("")),
  siren: z.string().trim().max(20).optional().or(z.literal("")),
  legalMentions: z.string().trim().max(500).optional().or(z.literal("")),
  contractType: z.enum(contractTypes, { message: "Type de contrat requis" }),
  functionTitle: z.string().trim().min(1, "Fonction requise").max(120),
  functionSub: z.string().trim().max(160).optional().or(z.literal("")),
  network: z.enum(networkTypes, { message: "Réseau requis" }),
  status: z.enum(memberStatuses).default("ACTIF"),
  companyId: z.string().optional().or(z.literal("")),
  agencyId: z.string().min(1, "Agence requise"),
  arrivalDate: z.string().min(1, "Date d'arrivée requise"),
  departureDate: z.string().optional().or(z.literal("")),

  // --- Habilitation ORIAS & assurances (optionnel) ---
  // L'ensemble des champs d'habilitation, y compris les identifiants/mots de passe,
  // est éditable afin que toutes les informations de la fiche soient modifiables.
  // L'accès reste contrôlé côté serveur par rôle et périmètre d'agence (cf. CLAUDE.md §4).
  oriasNumber: z.string().trim().max(40).optional().or(z.literal("")),
  oriasLogin: z.string().trim().max(120).optional().or(z.literal("")),
  oriasPassword: z.string().trim().max(120).optional().or(z.literal("")),
  oriasCategories: z.array(z.enum(oriasCategories)).default([]),
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
  // Associations professionnelles distinctes (accès séparés MIOBSP / MIA).
  assocMiobspLogin: z.string().trim().max(120).optional().or(z.literal("")),
  assocMiobspPassword: z.string().trim().max(120).optional().or(z.literal("")),
  assocMiaLogin: z.string().trim().max(120).optional().or(z.literal("")),
  assocMiaPassword: z.string().trim().max(120).optional().or(z.literal("")),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
