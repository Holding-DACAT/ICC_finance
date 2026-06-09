import { describe, expect, it } from "vitest";

import { computeComputerStatus } from "@/lib/computer";

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(15); // milieu de mois pour éviter les effets de bord
  return d;
}

describe("computeComputerStatus", () => {
  it("retourne ACTIF pour un poste récent (≤ 34 mois)", () => {
    expect(computeComputerStatus(monthsAgo(10))).toBe("ACTIF");
    expect(computeComputerStatus(monthsAgo(34))).toBe("ACTIF");
  });

  it("retourne A_RENOUVELER entre 35 et 36 mois", () => {
    expect(computeComputerStatus(monthsAgo(35))).toBe("A_RENOUVELER");
    expect(computeComputerStatus(monthsAgo(36))).toBe("A_RENOUVELER");
  });

  it("retourne EXPIRE au-delà de 36 mois", () => {
    expect(computeComputerStatus(monthsAgo(40))).toBe("EXPIRE");
  });
});
