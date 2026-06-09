import { z } from "zod";

/** Schémas Zod — frontière de validation des formulaires/API (cf. CLAUDE.md §3). */

export const contractTypes = ["CDI", "CDD", "MANDAT", "FRANCHISE"] as const;
export const networkTypes = ["FRANCHISE", "FILIALE", "AFFILIE"] as const;
export const memberStatuses = ["ACTIF", "INACTIF"] as const;
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

export const memberFormSchema = z.object({
  civility: z.string().trim().max(10).optional().or(z.literal("")),
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  contractType: z.enum(contractTypes, { message: "Type de contrat requis" }),
  functionTitle: z.string().trim().min(1, "Fonction requise").max(120),
  functionSub: z.string().trim().max(160).optional().or(z.literal("")),
  network: z.enum(networkTypes, { message: "Réseau requis" }),
  status: z.enum(memberStatuses).default("ACTIF"),
  agencyId: z.string().min(1, "Agence requise"),
  arrivalDate: z.string().min(1, "Date d'arrivée requise"),
  departureDate: z.string().optional().or(z.literal("")),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
