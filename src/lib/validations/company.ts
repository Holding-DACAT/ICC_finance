import { z } from "zod";

/** Schéma Zod — société (entité juridique / raison sociale). */
// Le statut actif/inactif d'une société est dérivé de ses agences et piloté par
// le bouton d'activation (cascade agences + membres) ; il n'est donc pas édité ici.

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Raison sociale requise").max(160),
  legalForm: z.string().trim().max(40).optional().or(z.literal("")),
  siren: z.string().trim().max(20).optional().or(z.literal("")),
  oriasNumber: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(160).email("Email invalide").optional().or(z.literal("")),
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
  sharePointUrl: z.string().trim().max(300).optional().or(z.literal("")),
  directorIds: z.array(z.string()).default([]),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
