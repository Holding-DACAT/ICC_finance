/**
 * Étapes (colonnes) du parcours d'intégration des nouveaux collaborateurs.
 *
 * Ces étapes servent à la fois :
 *  - de modèle par défaut lors de la création d'un onboarding (cf. `seed.ts`),
 *  - de colonnes du kanban d'onboarding (cf. `lib/onboarding.ts`).
 *
 * Volontairement génériques : elles seront affinées avec l'équipe RH.
 * La colonne finale « Intégration terminée » est dérivée (toutes les étapes
 * réalisées) et n'est donc pas listée ici.
 */
export const ONBOARDING_STAGES = [
  "Dossier administratif",
  "Contrat signé",
  "Compte AD & messagerie",
  "Matériel & accès IT",
  "Immatriculation ORIAS",
  "Formation initiale",
] as const;

/** Libellé de la colonne finale (étapes toutes réalisées). */
export const ONBOARDING_DONE_LABEL = "Intégration terminée";

export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];
