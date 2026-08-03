/**
 * Contrats de l'intégration **Actelo** (API de courtage — pilotage commercial).
 *
 * Toute intégration passe par cette interface : une implémentation **MOCK** est
 * activable via `USE_INTEGRATION_MOCKS=true` (cf. CLAUDE.md §2). L'implémentation
 * réelle (`client.ts`) interroge `https://api.actelo.fr` derrière la même
 * signature — brancher le vrai token ne change rien au reste de l'application.
 *
 * Les DTO ci-dessous sont **volontairement réduits** aux seuls champs consommés
 * par le pilotage commercial (principe de minimisation, cf. CLAUDE.md §4). Le
 * client réel se charge de projeter les schémas Actelo (champs `_d`,
 * `meta_parent`, etc.) vers ces formes simples.
 */

/** Agence du courtier (endpoint `GET /api/v1/agencies`). */
export interface ActeloAgency {
  id: string;
  name: string;
  /** Type Actelo (CLASSIQUE, MANDATAIRE…) — informatif. */
  type: string;
  isActive: boolean;
  parentAgencyId: string | null;
}

/** Collaborateur / utilisateur (endpoint `GET /api/v1/users`). */
export interface ActeloUser {
  id: string;
  firstName: string;
  lastName: string;
  /** SALARIE ou MANDATAIRE. */
  type: string;
  isActive: boolean;
  /** Identifiants des agences de rattachement (`profile.agencies[]._id`). */
  agencyIds: string[];
  /** Agence favorite / principale, si connue. */
  primaryAgencyId: string | null;
}

/**
 * Dossier de financement (endpoint `GET /api/v1/cases`), projeté sur les seules
 * données de pilotage. Les montants sont en euros.
 */
export interface ActeloCase {
  id: string;
  ref: string | null;
  /** Statut brut Actelo (ex. `05_ACCORDE`, `11_SIGNE`, `12_REFUSE`…). */
  status: string;
  /** Agence porteuse (`meta_parent.agencyId`). */
  agencyId: string | null;
  agencyName: string | null;
  /** Collaborateur responsable (`managerId`). */
  managerId: string | null;
  managerName: string | null;
  /** Montant emprunté / production (`amountBorrowed_d`). */
  amountBorrowed: number;
  /** Commission courtier (`brokerCommission_d`). */
  brokerCommission: number;
  /** Date de création du dossier (`meta_created.at`), ISO 8601. */
  createdAt: string;
  /** Date de signature (`stageDates.signDate`) si le dossier est signé, sinon null. */
  signDate: string | null;
}

/** Fenêtre temporelle d'interrogation des dossiers. */
export interface CaseQuery {
  from: Date;
  to: Date;
}

/**
 * Fournisseur de données commerciales Actelo. Implémentations : `mock.ts`
 * (démo, aucun appel réseau) et `client.ts` (API réelle).
 */
export interface ActeloProvider {
  /** Indique l'origine des données (affiché dans l'UI, ex. bandeau « démo »). */
  readonly kind: "mock" | "live";
  listAgencies(): Promise<ActeloAgency[]>;
  listUsers(params?: { agencyId?: string }): Promise<ActeloUser[]>;
  /** Dossiers créés OU signés dans la fenêtre demandée. */
  listCases(query: CaseQuery): Promise<ActeloCase[]>;
}
