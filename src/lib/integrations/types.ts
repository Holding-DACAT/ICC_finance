/**
 * Contrats des intégrations Microsoft (Graph / Entra ID / SharePoint).
 * Toute intégration passe par ces interfaces : une implémentation MOCK est
 * activable via USE_INTEGRATION_MOCKS=true (cf. CLAUDE.md §2). Les lots
 * ultérieurs ajouteront l'implémentation réelle derrière les mêmes signatures.
 */

export interface AdAccount {
  objectId: string;
  userPrincipalName: string;
  displayName: string;
  mailboxEnabled: boolean;
}

export interface SharePointLibrary {
  id: string;
  name: string;
  webUrl: string;
}

export interface MailboxState {
  address: string;
  provisioned: boolean;
  lastSyncAt: string | null;
}

export interface MicrosoftGraphProvider {
  /** Provisionne (ou retrouve) un compte Active Directory. */
  ensureAdAccount(input: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<AdAccount>;
  /** Liste les bibliothèques SharePoint accessibles (boutons « SharePoint »). */
  listSharePointLibraries(siteUrl?: string): Promise<SharePointLibrary[]>;
  /** État de la boîte mail d'un utilisateur. */
  getMailboxState(email: string): Promise<MailboxState>;
}
