import type {
  AdAccount,
  MailboxState,
  MicrosoftGraphProvider,
  SharePointLibrary,
} from "./types";

/** Implémentation MOCK de Microsoft Graph (aucun appel réseau réel). */
export const mockGraphProvider: MicrosoftGraphProvider = {
  async ensureAdAccount({ firstName, lastName, email }): Promise<AdAccount> {
    return {
      objectId: `mock-ad-${email}`,
      userPrincipalName: email,
      displayName: `${firstName} ${lastName}`.trim(),
      mailboxEnabled: true,
    };
  },

  async listSharePointLibraries(): Promise<SharePointLibrary[]> {
    return [
      {
        id: "mock-lib-rh",
        name: "Documents RH",
        webUrl: "https://example.sharepoint.com/sites/ICC/RH",
      },
      {
        id: "mock-lib-it",
        name: "Parc informatique",
        webUrl: "https://example.sharepoint.com/sites/ICC/IT",
      },
    ];
  },

  async getMailboxState(email): Promise<MailboxState> {
    return {
      address: email,
      provisioned: true,
      lastSyncAt: new Date().toISOString(),
    };
  },
};
