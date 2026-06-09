import { z } from "zod";

export const licenseTiers = ["SILVER", "GOLD"] as const;

export const computerFormSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
  model: z.string().trim().min(1, "Modèle requis").max(160),
  serialNumber: z.string().trim().min(1, "N° de série requis").max(80),
  registrationDate: z.string().min(1, "Date d'enregistrement requise"),
  lastSyncDate: z.string().optional().or(z.literal("")),
  diskFreePct: z
    .string()
    .refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 100), "Pourcentage entre 0 et 100"),
  licenseTier: z.enum(licenseTiers).or(z.literal("")).optional(),
  source: z.string().trim().max(40).optional().or(z.literal("")),
  assignedMemberId: z.string().optional().or(z.literal("")),
});

export type ComputerFormValues = z.infer<typeof computerFormSchema>;
