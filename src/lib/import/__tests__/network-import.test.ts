import { describe, expect, it } from "vitest";

import {
  detectLayout,
  mapContractType,
  mapOriasCategories,
  parseNetworkSheet,
  toDate,
} from "../network-import";

/** En-têtes reprises du fichier réel « Liste du Réseau » (avec accents/casse). */
const HEADER = [
  "Agence",
  "Sexe",
  "Nom",
  "Prénom",
  "Date naissance",
  "Age",
  "n° Télephone",
  "E-mail",
  "Adresse postale",
  "Statut",
  "Fonction",
  "Date d'arrivée",
  "Date départ",
  "Siren",
  "ORIAS",
  "Identifiants Orias & Afib",
  "Mdp Orias ",
  "Mdp Afib",
  "Mdp Votrasso",
  "N°RCPRO",
];

function rowFor(values: Partial<Record<number, unknown>>): unknown[] {
  return HEADER.map((_, i) => values[i] ?? null);
}

describe("detectLayout", () => {
  it("repère la ligne d'en-tête même précédée d'un titre", () => {
    const aoa = [["Liste du Réseau"], HEADER];
    const layout = detectLayout(aoa);
    expect(layout).not.toBeNull();
    expect(layout!.headerRowIndex).toBe(1);
    expect(layout!.columns.nom).toBe(2);
    expect(layout!.columns.email).toBe(7);
    expect(layout!.columns.arrivee).toBe(11);
    expect(layout!.columns.rcpro).toBe(19);
  });

  it("renvoie null si les colonnes clés manquent", () => {
    expect(detectLayout([["Colonne A", "Colonne B"]])).toBeNull();
  });
});

describe("toDate", () => {
  it("accepte une Date, un n° de série Excel et un texte jj/mm/aaaa", () => {
    const d = new Date(2020, 0, 15);
    expect(toDate(d)).toBe(d);
    expect(toDate("13/07/1988")?.getUTCFullYear()).toBe(1988);
    expect(toDate(44197)?.getUTCFullYear()).toBe(2021); // 01/01/2021
    expect(toDate("")).toBeNull();
    expect(toDate(null)).toBeNull();
  });
});

describe("mapContractType / mapOriasCategories", () => {
  it("déduit le contrat depuis le statut", () => {
    expect(mapContractType("Mandataire")).toBe("MANDAT");
    expect(mapContractType("Alternant")).toBe("CDD");
    expect(mapContractType("Salarié")).toBe("CDI");
    expect(mapContractType("Directeur d'Agence")).toBe("CDI");
  });

  it("extrait les catégories ORIAS reconnues", () => {
    expect(mapOriasCategories("MIOBSP & MIA")).toEqual(["MIOBSP", "MIA"]);
    expect(mapOriasCategories("COBSP & COA ")).toEqual(["COBSP", "COA"]);
    expect(mapOriasCategories("Responsable Financière")).toEqual([]);
  });
});

describe("parseNetworkSheet", () => {
  it("normalise une ligne valide complète", () => {
    const aoa = [
      HEADER,
      rowFor({
        0: "ICC Colomiers",
        1: "H",
        2: "Cariat",
        3: "Hugo",
        7: "hugo.cariat@icc-finance.fr",
        9: "Directeur Groupe",
        10: "COBSP & MIA",
        11: new Date(2011, 6, 1),
        14: "130 025 43",
        19: "AMRCP200201",
      }),
    ];
    const parsed = parseNetworkSheet(aoa);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.results).toHaveLength(1);
    const r = parsed.data.results[0];
    expect(r.ok).toBe(true);
    expect(r.member?.lastName).toBe("CARIAT");
    expect(r.member?.civility).toBe("M.");
    expect(r.member?.functionTitle).toBe("Directeur Groupe");
    expect(r.member?.functionSub).toBe("COBSP & MIA");
    expect(r.member?.oriasCategories).toEqual(["COBSP", "MIA"]);
    expect(r.member?.oriasNumber).toBe("130 025 43");
    expect(r.member?.rcProPolicy).toBe("AMRCP200201");
    expect(r.member?.status).toBe("ACTIF");
  });

  it("marque INACTIF quand une date de départ est présente", () => {
    const aoa = [
      HEADER,
      rowFor({
        0: "ICC Bordeaux",
        2: "Dupont",
        3: "Marie",
        7: "marie.dupont@icc-finance.fr",
        9: "Mandataire",
        11: new Date(2020, 0, 1),
        12: new Date(2024, 5, 30),
      }),
    ];
    const parsed = parseNetworkSheet(aoa);
    expect(parsed.ok && parsed.data.results[0].member?.status).toBe("INACTIF");
  });

  it("génère l'e-mail manquant et signale un avertissement", () => {
    const aoa = [
      HEADER,
      rowFor({ 0: "ICC Agen", 2: "Martin", 3: "Léa", 9: "Salarié", 11: new Date(2022, 2, 1) }),
    ];
    const parsed = parseNetworkSheet(aoa);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const r = parsed.data.results[0];
    expect(r.ok).toBe(true);
    expect(r.email).toBe("lea.martin@icc-finance.fr");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("rejette une ligne sans date d'arrivée et ignore les lignes vides", () => {
    const aoa = [
      HEADER,
      rowFor({ 0: "ICC Tarbes", 2: "Sans", 3: "Date", 7: "x@icc-finance.fr", 9: "Salarié" }),
      rowFor({}), // vide → ignorée
    ];
    const parsed = parseNetworkSheet(aoa);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.results).toHaveLength(1);
    expect(parsed.data.results[0].ok).toBe(false);
    expect(parsed.data.results[0].errors.join(" ")).toMatch(/arrivée/i);
  });
});
