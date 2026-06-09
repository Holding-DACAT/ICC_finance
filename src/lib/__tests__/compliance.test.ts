import { describe, expect, it } from "vitest";

import { computeComplianceStatus, worstCompliance } from "@/lib/compliance";

const NOW = new Date("2026-06-09T00:00:00Z");

function inDays(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("computeComplianceStatus", () => {
  it("A_JOUR sans date ou échéance lointaine", () => {
    expect(computeComplianceStatus(null, NOW)).toBe("A_JOUR");
    expect(computeComplianceStatus(inDays(120), NOW)).toBe("A_JOUR");
  });

  it("A_RENOUVELER dans la fenêtre de 60 jours", () => {
    expect(computeComplianceStatus(inDays(30), NOW)).toBe("A_RENOUVELER");
    expect(computeComplianceStatus(inDays(60), NOW)).toBe("A_RENOUVELER");
  });

  it("EXPIRE si l'échéance est passée", () => {
    expect(computeComplianceStatus(inDays(-1), NOW)).toBe("EXPIRE");
  });
});

describe("worstCompliance", () => {
  it("retient l'état le plus défavorable", () => {
    expect(worstCompliance("A_JOUR", "A_RENOUVELER", "EXPIRE")).toBe("EXPIRE");
    expect(worstCompliance("A_JOUR", "A_RENOUVELER")).toBe("A_RENOUVELER");
    expect(worstCompliance("A_JOUR", "A_JOUR")).toBe("A_JOUR");
  });
});
