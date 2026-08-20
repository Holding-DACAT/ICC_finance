import { describe, expect, it } from "vitest";

import {
  computeEcart,
  expectedAmountCents,
  formatMonth,
  normalizeSiren,
  parseMonth,
  parsePaymentMode,
  parseRemunerationLabel,
  parseSignature,
  ratio,
  resolveVersementStatus,
  toCents,
} from "@/lib/apporteur";

describe("toCents", () => {
  it("accepte nombres et libellés du classeur", () => {
    expect(toCents(630.98)).toBe(63098);
    expect(toCents("500")).toBe(50000);
    expect(toCents("1 234,56 €")).toBe(123456);
    expect(toCents("")).toBeNull();
    expect(toCents("annulé")).toBeNull();
  });
});

describe("ratio", () => {
  it("évite les #DIV/0! du tableur", () => {
    expect(ratio(50000, 200000)).toBe(0.25);
    expect(ratio(50000, 0)).toBeNull();
    expect(ratio(50000, null)).toBeNull();
  });
});

describe("parseRemunerationLabel", () => {
  it("pourcentage plafonné", () => {
    expect(parseRemunerationLabel("30% TTC - Plafond 500€")).toEqual({
      type: "POURCENTAGE",
      rate: 0.3,
      fixedCents: null,
      capCents: 50000,
      base: "COMMISSION",
    });
  });

  it("pourcentage non plafonné", () => {
    const rule = parseRemunerationLabel("50% TTC - Non plafonnée");
    expect(rule).toMatchObject({ type: "POURCENTAGE", rate: 0.5, capCents: null });
  });

  it("forfait", () => {
    expect(parseRemunerationLabel("500€ TTC")).toMatchObject({
      type: "FORFAIT",
      fixedCents: 50000,
    });
    expect(parseRemunerationLabel("1500")).toMatchObject({ type: "FORFAIT", fixedCents: 150000 });
  });

  it("absence de rétro-commissionnement", () => {
    expect(parseRemunerationLabel("Aucun rétro-commissionnement")).toMatchObject({
      type: "AUCUNE",
    });
  });

  it("libellé vide", () => {
    expect(parseRemunerationLabel(null)).toBeNull();
    expect(parseRemunerationLabel("   ")).toBeNull();
  });
});

describe("expectedAmountCents", () => {
  const rule30cap500 = parseRemunerationLabel("30% TTC - Plafond 500€");

  it("applique le taux sur la commission", () => {
    expect(expectedAmountCents(rule30cap500, { commissionCents: 100000, feesCents: 300000 })).toBe(
      30000,
    );
  });

  it("applique le plafond", () => {
    expect(expectedAmountCents(rule30cap500, { commissionCents: 400000, feesCents: null })).toBe(
      50000,
    );
  });

  it("assiette inconnue : pas de calcul possible", () => {
    expect(expectedAmountCents(rule30cap500, { commissionCents: null, feesCents: 200000 })).toBeNull();
  });

  it("règle non documentée : aucun calcul (et donc aucun contrôle)", () => {
    expect(
      expectedAmountCents(
        { type: "NON_RENSEIGNEE", rate: null, fixedCents: null, capCents: null, base: "COMMISSION" },
        { commissionCents: 100000, feesCents: 200000 },
      ),
    ).toBeNull();
  });

  it("base honoraires", () => {
    const rule = parseRemunerationLabel("25% TTC - Non plafonnée");
    expect(
      expectedAmountCents(
        { ...rule!, base: "HONORAIRES" },
        { commissionCents: null, feesCents: 200000 },
      ),
    ).toBe(50000);
  });
});

describe("computeEcart", () => {
  const rule = parseRemunerationLabel("30% TTC - Non plafonnée");

  it("pas d'anomalie dans la tolérance d'arrondi", () => {
    const res = computeEcart(rule, { commissionCents: 27619, feesCents: null }, 8285);
    expect(res.expectedCents).toBe(8286);
    expect(res.isAnomaly).toBe(false);
  });

  it("anomalie au-delà de la tolérance", () => {
    const res = computeEcart(rule, { commissionCents: 100000, feesCents: null }, 50000);
    expect(res.deltaCents).toBe(20000);
    expect(res.isAnomaly).toBe(true);
  });

  it("assiette inconnue : aucun contrôle", () => {
    expect(computeEcart(rule, { commissionCents: null, feesCents: null }, 50000)).toEqual({
      expectedCents: null,
      deltaCents: null,
      isAnomaly: false,
    });
  });
});

describe("parseMonth / formatMonth", () => {
  it("tolère accents, casse et dates", () => {
    expect(parseMonth("Décembre")).toBe(12);
    expect(parseMonth("aout")).toBe(8);
    expect(parseMonth("Août ")).toBe(8);
    expect(parseMonth(new Date("2026-04-01T00:00:00"))).toBe(4);
    expect(parseMonth("")).toBeNull();
  });

  it("libellé FR", () => {
    expect(formatMonth(2)).toBe("Février");
    expect(formatMonth(null)).toBe("—");
  });
});

describe("normalizeSiren", () => {
  it("rejette les valeurs de remplissage", () => {
    expect(normalizeSiren(490616281)).toBe("490616281");
    expect(normalizeSiren("490 616 281")).toBe("490616281");
    expect(normalizeSiren(0)).toBeNull();
    expect(normalizeSiren("NON AURORE")).toBeNull();
    expect(normalizeSiren("#N/A")).toBeNull();
  });
});

describe("parseSignature", () => {
  it("mappe les statuts métier", () => {
    expect(parseSignature("OK").status).toBe("SIGNEE");
    expect(parseSignature("A FAIRE").status).toBe("A_FAIRE");
    expect(parseSignature("NOK").status).toBe("NON_SIGNEE");
    expect(parseSignature("STOP").status).toBe("RESILIEE");
  });

  it("LABEGE / MURET désignent la société détentrice", () => {
    expect(parseSignature("LABEGE")).toEqual({ status: "A_FAIRE", holderLabel: "ICC LABEGE" });
    expect(parseSignature("MURET").holderLabel).toBe("ICC MURET");
  });

  it("valeurs vides ou #N/A", () => {
    expect(parseSignature("#N/A").status).toBe("A_FAIRE");
    expect(parseSignature(null).status).toBe("A_FAIRE");
  });
});

describe("parsePaymentMode", () => {
  it("distingue virement, déduction et numéro de chèque", () => {
    expect(parsePaymentMode("virement")).toEqual({ mode: "VIREMENT", ref: null });
    expect(parsePaymentMode("deduit")).toEqual({ mode: "DEDUIT", ref: null });
    expect(parsePaymentMode(4017367)).toEqual({ mode: "CHEQUE", ref: "4017367" });
  });
});

describe("resolveVersementStatus", () => {
  it("annulé, versé ou à verser", () => {
    expect(
      resolveVersementStatus({ cancelled: true, paymentDate: new Date(), amountCents: 0 }),
    ).toBe("ANNULE");
    expect(
      resolveVersementStatus({
        cancelled: false,
        paymentDate: new Date("2026-03-02"),
        amountCents: 50000,
      }),
    ).toBe("VERSE");
    expect(
      resolveVersementStatus({ cancelled: false, paymentDate: null, amountCents: 50000 }),
    ).toBe("A_VERSER");
  });
});
