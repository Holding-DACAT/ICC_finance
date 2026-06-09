import { describe, expect, it } from "vitest";

import { computeRedevanceLine, DEFAULTS } from "@/lib/redevance";

describe("computeRedevanceLine", () => {
  it("calcule HT, TTC et moyenne par personne", () => {
    const line = computeRedevanceLine(6, 2, DEFAULTS);
    expect(line.silverHT).toBeCloseTo(349.98, 2); // 6 × 58,33
    expect(line.goldHT).toBeCloseTo(225, 2); // 2 × 112,50
    expect(line.totalHT).toBeCloseTo(574.98, 2);
    expect(line.totalTTC).toBeCloseTo(689.976, 2); // ×1,2
    expect(line.avgPerPersonHT).toBeCloseTo(574.98 / 8, 2);
  });

  it("évite la division par zéro sans licence", () => {
    const line = computeRedevanceLine(0, 0, DEFAULTS);
    expect(line.totalHT).toBe(0);
    expect(line.avgPerPersonHT).toBe(0);
    expect(line.avgPerPersonTTC).toBe(0);
  });
});
