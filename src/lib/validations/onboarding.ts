import { z } from "zod";

/** Validation de la liste éditable des étapes d'onboarding (kanban). */
export const onboardingStagesSchema = z.object({
  stages: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Le libellé d'une étape ne peut pas être vide.")
        .max(60, "Le libellé d'une étape est trop long (60 caractères max)."),
    )
    .min(1, "Au moins une étape est requise.")
    .max(12, "12 étapes au maximum.")
    .refine(
      (stages) => new Set(stages.map((s) => s.toLowerCase())).size === stages.length,
      "Les étapes doivent être uniques.",
    ),
});

export type OnboardingStagesValues = z.infer<typeof onboardingStagesSchema>;
