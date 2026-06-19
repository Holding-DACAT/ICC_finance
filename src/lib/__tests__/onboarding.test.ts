import { describe, expect, it } from "vitest";

import { buildColumns, columnIndexFor, deriveProgress } from "@/lib/onboarding";
import { ONBOARDING_DONE_LABEL } from "@/lib/onboarding-stages";

const s = (status: string) => ({ status });

describe("columnIndexFor", () => {
  it("place une carte sur la première étape non terminée", () => {
    expect(columnIndexFor([s("FAIT"), s("FAIT"), s("A_FAIRE"), s("A_FAIRE")])).toBe(2);
  });

  it("place une carte avec étape en cours sur cette étape", () => {
    expect(columnIndexFor([s("FAIT"), s("EN_COURS"), s("A_FAIRE")])).toBe(1);
  });

  it("place une carte entièrement terminée dans la colonne finale", () => {
    expect(columnIndexFor([s("FAIT"), s("FAIT")])).toBe(2);
  });

  it("place une carte vierge sur la première colonne", () => {
    expect(columnIndexFor([s("A_FAIRE"), s("A_FAIRE")])).toBe(0);
  });

  it("gère l'absence d'étapes", () => {
    expect(columnIndexFor([])).toBe(0);
  });
});

describe("deriveProgress", () => {
  it("renvoie AUCUN à 0% quand rien n'est fait", () => {
    expect(deriveProgress([s("A_FAIRE"), s("A_FAIRE")])).toEqual({ status: "AUCUN", progress: 0 });
  });

  it("renvoie EN_COURS avec un avancement arrondi", () => {
    expect(deriveProgress([s("FAIT"), s("A_FAIRE"), s("A_FAIRE")])).toEqual({
      status: "EN_COURS",
      progress: 33,
    });
  });

  it("renvoie TERMINE à 100% quand tout est fait", () => {
    expect(deriveProgress([s("FAIT"), s("FAIT")])).toEqual({ status: "TERMINE", progress: 100 });
  });

  it("gère l'absence d'étapes", () => {
    expect(deriveProgress([])).toEqual({ status: "AUCUN", progress: 0 });
  });
});

describe("buildColumns", () => {
  it("ajoute la colonne finale dérivée aux étapes", () => {
    expect(buildColumns(["A", "B"])).toEqual(["A", "B", ONBOARDING_DONE_LABEL]);
  });
});
