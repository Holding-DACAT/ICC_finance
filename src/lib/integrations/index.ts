import { mockGraphProvider } from "./mock";
import type { MicrosoftGraphProvider } from "./types";

export * from "./types";

const useMocks = process.env.USE_INTEGRATION_MOCKS === "true";

/**
 * Point d'entrée unique des intégrations Microsoft.
 * Tant que l'implémentation réelle (Graph) n'est pas branchée (lot 7),
 * on retourne le mock dès que USE_INTEGRATION_MOCKS=true.
 */
export function getGraphProvider(): MicrosoftGraphProvider {
  if (useMocks) return mockGraphProvider;
  // TODO (lot 7) : implémentation réelle via @microsoft/microsoft-graph-client.
  throw new Error(
    "Intégration Microsoft Graph réelle non encore implémentée. Activez USE_INTEGRATION_MOCKS=true.",
  );
}
