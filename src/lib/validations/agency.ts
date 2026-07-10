import { z } from "zod";

export const agencyTypes = ["FRANCHISE", "FILIALE"] as const;
export const agencyStatuses = ["ACTIF", "INACTIF"] as const;

export const agencyFormSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  type: z.enum(agencyTypes, { message: "Type requis" }),
  status: z.enum(agencyStatuses).default("ACTIF"),
  // Société de rattachement (raison sociale) : porte la forme juridique, le
  // SIREN, l'ORIAS et les assurances. Sélectionnée à la création de l'agence.
  companyId: z.string().optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(160).email("Email invalide").optional().or(z.literal("")),
  sharePointUrl: z.string().trim().max(300).optional().or(z.literal("")),
  redevanceExcluded: z.boolean().default(false),
  directorIds: z.array(z.string()).default([]),
});

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;
