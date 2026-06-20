import { describe, expect, it } from "vitest";

import { computeHabilitationKpis, type HabilitationRow } from "@/lib/habilitation";

function row(overrides: Partial<HabilitationRow>): HabilitationRow {
  return {
    memberId: "m",
    firstName: "Jean",
    lastName: "DUPONT",
    fullName: "DUPONT Jean",
    agencyName: "Agence",
    functionTitle: "Mandataire",
    functionSub: null,
    network: "FRANCHISE",
    memberStatus: "ACTIF",
    oriasNumber: "ORIAS-1",
    categories: ["COBSP"],
    complianceStatus: "A_JOUR",
    renewalDate: null,
    rcProInsurer: null,
    rcProExpiry: null,
    guaranteeAmount: null,
    guaranteeExpiry: null,
    habilitationStatus: "A_VALIDER",
    habilitationYear: null,
    habilitationValidatedAt: null,
    ...overrides,
  };
}

describe("computeHabilitationKpis", () => {
  it("compte total, validées, à valider et ORIAS expirés", () => {
    const rows = [
      row({ habilitationStatus: "VALIDEE" }),
      row({ habilitationStatus: "VALIDEE" }),
      row({ habilitationStatus: "A_VALIDER" }),
      row({ habilitationStatus: "A_VALIDER", complianceStatus: "EXPIRE" }),
    ];
    expect(computeHabilitationKpis(rows)).toEqual({
      total: 4,
      validees: 2,
      aValider: 2,
      expirees: 1,
    });
  });

  it("renvoie des compteurs nuls pour une liste vide", () => {
    expect(computeHabilitationKpis([])).toEqual({
      total: 0,
      validees: 0,
      aValider: 0,
      expirees: 0,
    });
  });
});
