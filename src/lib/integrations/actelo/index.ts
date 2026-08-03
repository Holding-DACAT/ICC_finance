/**
 * Point d'entrée unique de l'intégration **Actelo** (pilotage commercial).
 *
 * Renvoie le MOCK tant que `USE_INTEGRATION_MOCKS=true` ou qu'aucun
 * `ACTELO_API_TOKEN` n'est configuré ; sinon l'implémentation réelle. Ainsi la
 * démo fonctionne sans réseau, et brancher le token bascule automatiquement sur
 * l'API réelle sans toucher au reste du code.
 */

import { liveActeloProvider } from "./client";
import { mockActeloProvider } from "./mock";
import type { ActeloProvider } from "./types";

export * from "./types";

export function getActeloProvider(): ActeloProvider {
  const forceMock = process.env.USE_INTEGRATION_MOCKS === "true";
  const hasToken = Boolean(process.env.ACTELO_API_TOKEN);
  if (forceMock || !hasToken) return mockActeloProvider;
  return liveActeloProvider;
}
