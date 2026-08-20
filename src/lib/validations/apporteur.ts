import { z } from "zod";

/** Schémas Zod — apporteurs d'affaires, conventions et versements de ristourne. */

export const apporteurStatuses = ["ACTIF", "INACTIF"] as const;
export const conventionStatuses = ["SIGNEE", "A_FAIRE", "NON_SIGNEE", "RESILIEE"] as const;
export const remunerationTypes = ["POURCENTAGE", "FORFAIT", "AUCUNE", "NON_RENSEIGNEE"] as const;
export const remunerationBases = ["COMMISSION", "HONORAIRES"] as const;
export const versementTypes = ["RISTOURNE", "DON", "PARRAINAGE"] as const;
export const versementStatuses = ["A_VERSER", "VERSE", "ANNULE"] as const;
export const paymentModes = ["VIREMENT", "CHEQUE", "DEDUIT", "AUTRE"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** SIREN : 9 chiffres (espaces tolérés à la saisie). */
const sirenField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => v === "" || /^\d{9}$/.test(v), "SIREN invalide (9 chiffres attendus).")
  .optional()
  .or(z.literal(""));

/** Montant en euros saisi au format FR (« 1 234,56 »). */
const amountField = (message: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d+([.,]\d{1,2})?$/.test(v.replace(/\s/g, "")),
      message,
    )
    .optional()
    .or(z.literal(""));

export const apporteurFormSchema = z.object({
  name: z.string().trim().min(1, "Nom de l'apporteur requis").max(160),
  siren: sirenField,
  enseigne: optionalText(120),
  holderName: optionalText(160),
  email: z.string().trim().max(160).email("Email invalide").optional().or(z.literal("")),
  phone: optionalText(30),
  address: optionalText(240),
  postalCode: optionalText(10),
  city: optionalText(120),
  kbisDate: z.string().optional().or(z.literal("")),
  ribReceived: z.boolean().default(false),
  status: z.enum(apporteurStatuses).default("ACTIF"),
  companyId: optionalText(40),
  notes: optionalText(2000),
});

export type ApporteurFormValues = z.infer<typeof apporteurFormSchema>;

export const conventionFormSchema = z
  .object({
    apporteurId: z.string().trim().min(1, "Apporteur requis"),
    number: optionalText(60),
    requestedBy: optionalText(120),
    signatureStatus: z.enum(conventionStatuses).default("A_FAIRE"),
    conventionDate: z.string().optional().or(z.literal("")),
    kbisDate: z.string().optional().or(z.literal("")),
    holderName: optionalText(160),
    address: optionalText(240),
    postalCode: optionalText(10),
    city: optionalText(120),
    endDate: z.string().optional().or(z.literal("")),
    companyId: optionalText(40),
    notes: optionalText(2000),
    remunerationType: z.enum(remunerationTypes).default("POURCENTAGE"),
    /** Taux en pourcentage (30 pour 30 %). */
    remunerationRate: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (/^\d+([.,]\d{1,2})?$/.test(v) && Number(v.replace(",", ".")) <= 100),
        "Taux invalide (0 à 100).",
      )
      .optional()
      .or(z.literal("")),
    remunerationFixed: amountField("Forfait invalide."),
    remunerationCap: amountField("Plafond invalide."),
    remunerationBase: z.enum(remunerationBases).default("COMMISSION"),
  })
  .refine((v) => v.remunerationType !== "POURCENTAGE" || Boolean(v.remunerationRate), {
    message: "Taux requis pour une rétrocession en pourcentage.",
    path: ["remunerationRate"],
  })
  .refine((v) => v.remunerationType !== "FORFAIT" || Boolean(v.remunerationFixed), {
    message: "Montant requis pour un forfait.",
    path: ["remunerationFixed"],
  });

export type ConventionFormValues = z.infer<typeof conventionFormSchema>;

export const versementFormSchema = z.object({
  apporteurId: z.string().trim().min(1, "Apporteur requis"),
  conventionId: optionalText(40),
  companyId: optionalText(40),
  agencyId: optionalText(40),
  memberId: optionalText(40),
  commercialName: z.string().trim().min(1, "Commercial requis").max(120),
  type: z.enum(versementTypes).default("RISTOURNE"),
  year: z
    .string()
    .trim()
    .regex(/^20\d{2}$/, "Année invalide (AAAA)."),
  month: optionalText(2),
  dossierLabel: z.string().trim().min(1, "Dossier requis").max(160),
  acteloCaseId: optionalText(60),
  amount: amountField("Montant invalide.").refine((v) => Boolean(v), "Montant requis."),
  commission: amountField("Commission invalide."),
  fees: amountField("Honoraires invalides."),
  paymentMode: z.enum(paymentModes).default("VIREMENT"),
  paymentRef: optionalText(60),
  invoiceReceived: z.boolean().default(false),
  paymentDate: z.string().optional().or(z.literal("")),
  sirenKbis: sirenField,
  sirenInvoice: sirenField,
  sirenVerified: z.boolean().default(false),
  status: z.enum(versementStatuses).default("A_VERSER"),
  notes: optionalText(2000),
});

export type VersementFormValues = z.infer<typeof versementFormSchema>;
