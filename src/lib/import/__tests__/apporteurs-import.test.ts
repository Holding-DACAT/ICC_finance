import { describe, expect, it } from "vitest";

import {
  parseApporteurLabel,
  parseApporteursWorkbook,
  yearFromSheetName,
} from "@/lib/import/apporteurs-import";

const CONVENTIONS = [
  [
    "Apporteurs :",
    "N° convention :",
    "Demandé par :",
    "Date convention :",
    "Signature :",
    "N° SIREN :",
    "Date kbis :",
    "Titulaire(s) :",
    "Adresse :",
    "Code Postal :",
    "Ville :",
    "Rémunérations :",
  ],
  [
    "CARE IMMOBILIER",
    2,
    "Virginie FINKELTIN",
    new Date("2018-10-26T00:00:00Z"),
    "OK",
    532439106,
    new Date("2018-01-15T00:00:00Z"),
    "CARE Claude Louis",
    "7 route d'Albi",
    31180,
    "Castelmaurou",
    "30% TTC - Non plafonnée",
  ],
  [
    "BERTRAND DUCROS",
    1,
    "Marion GAUVRIT",
    new Date("2020-02-26T00:00:00Z"),
    "STOP",
    484527130,
    null,
    "DUCROS Bertrand",
    "Lieu dit les Magreres",
    31370,
    "Poucharramet",
    "Aucun rétro-commissionnement",
  ],
  ["NCAS", "MANDATAIRE", "Kievin MERCIER", null, "LABEGE", 0, null, null, null, null, null, null],
];

const VERSEMENTS_2025 = [
  ["Parrainage / Ristourne - 2025"],
  [],
  [
    "Agence",
    "Commercial",
    "Ristourne / Chq Cdx",
    "Mois",
    "Apporteurs / Personnes parainnées",
    "N°SIREN kbis",
    "N°SIREN facture",
    "Vérif signature convention",
    "Dossiers",
    "Montant",
    "Mode paiement",
    "Facture",
    "Date versement",
    "Vérif SIREN",
    "Commission perçue",
    "Honoraires perçu",
    "% CB",
    "% CA",
  ],
  [
    "ICC FINANCE",
    "Marion GAUVRIT",
    "Ristourne",
    "Juin",
    "HOMEKARE (IMMOSKY)",
    490616281,
    490616281,
    "OK",
    "AL HADDAD",
    630.98,
    "virement",
    "OK",
    new Date("2025-07-07T00:00:00Z"),
    true,
    630.98,
    1850,
    1,
    0.254,
  ],
  [
    "ICC LABEGE",
    "William TAEVERNIER",
    "Ristourne",
    "Mars",
    "EI MOUNIA MICHELEAU",
    889591715,
    null,
    "LABEGE",
    "ANGLADE",
    300,
    4017367,
    "OK",
    null,
    false,
    1000,
    3000,
    0.3,
    0.075,
  ],
];

const VERSEMENTS_2022 = [
  ["Ristournes - 2022"],
  [
    "Agent commercial",
    "Agence",
    "Commercial",
    "Mois",
    "Apporteurs",
    "N°SIREN",
    "Dossiers",
    "Montant",
    "Commission perçue",
    "% Ristourne",
    "N° chèque",
    "Facture",
    "Date encaissement",
    "N° SIRET",
  ],
  [
    "Sandra STARANTINO",
    "Colomiers",
    "Fabrice CULINAT",
    "Aout",
    "CENTURY 21 - annulé 234,87€",
    "annulé",
    "GUIBBERT",
    0,
    782.89,
    0,
    "annulé",
    "annulé",
    "annulé",
    "annulé",
  ],
  [
    "Damien OLMOS",
    "Colomiers",
    "Héloïse SIMON",
    "Avril",
    "DAMIEN OLMOS",
    888891207,
    "BOSELLI LACOUA",
    82.85,
    276.19,
    0.3,
    4017440,
    "OK",
    new Date("2022-04-14T00:00:00Z"),
    19,
  ],
];

const COORDONNEES = [
  ["", "Date immat", "Contrat", "N° Siren", "Siège", "Enseigne", "Société"],
  ["", new Date("1991-03-26T00:00:00Z"), "OK", 381252766, 47, "L'ADRESSE", "AERO IMMOBILIER"],
];

describe("parseApporteurLabel", () => {
  it("extrait l'enseigne des parenthèses", () => {
    expect(parseApporteurLabel("HOMEKARE (IMMOSKY)")).toEqual({
      name: "HOMEKARE",
      enseigne: "IMMOSKY",
      cancelled: false,
    });
  });

  it("repère les annulations et nettoie le libellé", () => {
    const res = parseApporteurLabel("CENTURY 21 - annulé 234,87€");
    expect(res.name).toBe("CENTURY 21");
    expect(res.cancelled).toBe(true);
  });

  it("ignore les parenthèses portant un montant", () => {
    expect(parseApporteurLabel("JFC FINANCES (276,15€) - annulé").enseigne).toBeNull();
  });
});

describe("yearFromSheetName", () => {
  it("année pleine ou exercice", () => {
    expect(yearFromSheetName("Suivi apporteurs 2024")).toBe(2024);
    expect(yearFromSheetName("Suivi apporteurs 21-22")).toBe(2022);
    expect(yearFromSheetName("Coordonnées apporteurs")).toBeNull();
  });
});

describe("parseApporteursWorkbook", () => {
  const result = parseApporteursWorkbook([
    { name: "LISTE DES CONVENTIONS", aoa: CONVENTIONS },
    { name: "Suivi apporteurs 2025", aoa: VERSEMENTS_2025 },
    { name: "Suivi apporteurs 2022", aoa: VERSEMENTS_2022 },
    { name: "Coordonnées apporteurs", aoa: COORDONNEES },
  ]);

  it("classe les feuilles et ignore les annexes", () => {
    expect(result.sheets.map((s) => s.kind)).toEqual(["conventions", "versements", "versements"]);
    expect(result.ignoredSheets).toEqual(["Coordonnées apporteurs"]);
  });

  it("structure la règle de rétrocession", () => {
    const care = result.conventions[0].value!;
    expect(care.apporteurName).toBe("CARE IMMOBILIER");
    expect(care.siren).toBe("532439106");
    expect(care.signatureStatus).toBe("SIGNEE");
    expect(care.remuneration).toMatchObject({ type: "POURCENTAGE", rate: 0.3, capCents: null });
  });

  it("mappe STOP en convention résiliée", () => {
    expect(result.conventions[1].value!.signatureStatus).toBe("RESILIEE");
    expect(result.conventions[1].value!.remuneration).toMatchObject({ type: "AUCUNE" });
  });

  it("sort LABEGE de la colonne signature vers la société détentrice", () => {
    const ncas = result.conventions[2].value!;
    expect(ncas.signatureStatus).toBe("A_FAIRE");
    expect(ncas.holderCompanyLabel).toBe("ICC LABEGE");
    expect(ncas.siren).toBeNull();
  });

  it("normalise un versement 2025 (société, montants en centimes, virement)", () => {
    const v = result.versements[0].value!;
    expect(v).toMatchObject({
      apporteurName: "HOMEKARE",
      enseigne: "IMMOSKY",
      companyLabel: "ICC FINANCE",
      agencyLabel: null,
      commercialName: "Marion GAUVRIT",
      type: "RISTOURNE",
      year: 2025,
      month: 6,
      amountCents: 63098,
      commissionCents: 63098,
      feesCents: 185000,
      paymentMode: "VIREMENT",
      invoiceReceived: true,
      sirenVerified: true,
      status: "VERSE",
      sourceSheet: "Suivi apporteurs 2025",
      sourceRow: 4,
    });
  });

  it("détecte un n° de chèque et un versement encore à payer", () => {
    const v = result.versements[1].value!;
    expect(v.paymentMode).toBe("CHEQUE");
    expect(v.paymentRef).toBe("4017367");
    expect(v.status).toBe("A_VERSER");
    expect(v.holderCompanyLabel).toBe("ICC LABEGE");
  });

  it("reprend les feuilles anciennes : agence, année de la feuille, annulation", () => {
    const cancelled = result.versements[2].value!;
    expect(cancelled.status).toBe("ANNULE");
    expect(cancelled.year).toBe(2022);
    expect(cancelled.agencyLabel).toBe("Colomiers");
    expect(cancelled.companyLabel).toBeNull();

    const ok = result.versements[3].value!;
    expect(ok.month).toBe(4);
    expect(ok.amountCents).toBe(8285);
    expect(ok.commissionCents).toBe(27619);
    expect(ok.status).toBe("VERSE");
  });
});
