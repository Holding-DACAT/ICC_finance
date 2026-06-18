import { z } from "zod";

export const agencyTypes = ["FRANCHISE", "FILIALE"] as const;
export const agencyStatuses = ["ACTIF", "INACTIF"] as const;

export const agencyFormSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  type: z.enum(agencyTypes, { message: "Type requis" }),
  status: z.enum(agencyStatuses).default("ACTIF"),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  legalForm: z.string().trim().max(40).optional().or(z.literal("")),
  siren: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(160).email("Email invalide").optional().or(z.literal("")),
  oriasNumber: z.string().trim().max(40).optional().or(z.literal("")),
  rcProInsurer: z.string().trim().max(120).optional().or(z.literal("")),
  rcProExpiry: z.string().optional().or(z.literal("")),
  guaranteeAmount: z.string().optional().or(z.literal("")),
  guaranteeExpiry: z.string().optional().or(z.literal("")),
  sharePointUrl: z.string().trim().max(300).optional().or(z.literal("")),
  redevanceExcluded: z.boolean().default(false),
  directorIds: z.array(z.string()).default([]),
});

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;
