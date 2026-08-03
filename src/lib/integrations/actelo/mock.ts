/**
 * Implémentation **MOCK** du fournisseur Actelo (cf. `types.ts`).
 *
 * Génère un jeu de données déterministe et réaliste (agences, collaborateurs,
 * dossiers répartis sur ~15 mois glissants) afin de visualiser le pilotage
 * commercial sans aucun appel réseau. Activée par `USE_INTEGRATION_MOCKS=true`.
 *
 * Aucune donnée personnelle réelle : noms fictifs, montants simulés.
 */

import type {
  ActeloAgency,
  ActeloCase,
  ActeloProvider,
  ActeloUser,
  CaseQuery,
} from "./types";

// --- Générateur pseudo-aléatoire déterministe (mulberry32) ------------------
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const between = (r: () => number, min: number, max: number): number =>
  Math.round(min + r() * (max - min));

// --- Référentiels fictifs ---------------------------------------------------
const AGENCIES: ActeloAgency[] = [
  { id: "agc_paris", name: "ICC Finance Paris", type: "CLASSIQUE", isActive: true, parentAgencyId: null },
  { id: "agc_lyon", name: "ICC Finance Lyon", type: "CLASSIQUE", isActive: true, parentAgencyId: null },
  { id: "agc_bordeaux", name: "ICC Finance Bordeaux", type: "CLASSIQUE", isActive: true, parentAgencyId: null },
  { id: "agc_lille", name: "ICC Finance Lille", type: "CLASSIQUE", isActive: true, parentAgencyId: null },
  { id: "agc_marseille", name: "ICC Finance Marseille", type: "CLASSIQUE", isActive: true, parentAgencyId: null },
  { id: "agc_nantes", name: "ICC Finance Nantes", type: "MANDATAIRE", isActive: true, parentAgencyId: null },
];

const FIRST_NAMES = [
  "Camille", "Julien", "Sophie", "Thomas", "Léa", "Nicolas", "Marie", "Antoine",
  "Chloé", "Maxime", "Émilie", "Alexandre", "Laura", "Guillaume", "Sarah", "Romain",
];
const LAST_NAMES = [
  "Martin", "Bernard", "Dubois", "Robert", "Petit", "Durand", "Leroy", "Moreau",
  "Fournier", "Girard", "Bonnet", "Lambert", "Rousseau", "Vincent", "Muller", "Faure",
];

/** Statuts pondérés (répartition réaliste d'un portefeuille). */
const STATUS_POOL: string[] = [
  ...Array(5).fill("11_SIGNE"),
  ...Array(3).fill("05_ACCORDE"),
  ...Array(2).fill("06_RDV_BANQUE_EFFECTUE"),
  ...Array(3).fill("04_A_LA_BANQUE"),
  ...Array(3).fill("03_MONTAGE"),
  ...Array(2).fill("01_RDV_1"),
  ...Array(2).fill("14_A_SUIVRE"),
  ...Array(2).fill("12_REFUSE"),
  "123_ABSENCE_REPONSE_BANQUE",
  ...Array(2).fill("13_ANNULE"),
  "15_CLOTURE",
];

const SIGNED_STATUSES = new Set(["11_SIGNE"]);

function buildUsers(): ActeloUser[] {
  const r = rng(4242);
  const users: ActeloUser[] = [];
  let idx = 0;
  for (const agency of AGENCIES) {
    const count = between(r, 2, 4);
    for (let i = 0; i < count; i++) {
      const firstName = pick(r, FIRST_NAMES);
      const lastName = pick(r, LAST_NAMES);
      users.push({
        id: `usr_${idx.toString().padStart(3, "0")}`,
        firstName,
        lastName,
        type: agency.type === "MANDATAIRE" || r() > 0.6 ? "MANDATAIRE" : "SALARIE",
        isActive: r() > 0.08,
        agencyIds: [agency.id],
        primaryAgencyId: agency.id,
      });
      idx++;
    }
  }
  return users;
}

const USERS = buildUsers();

/**
 * Génère les dossiers sur ~15 mois glissants, ancrés sur la date du jour.
 * Déterministe (graine fixe) : le même appel renvoie toujours le même jeu.
 */
function buildCases(reference: Date): ActeloCase[] {
  const r = rng(90210);
  const cases: ActeloCase[] = [];
  const usersByAgency = new Map<string, ActeloUser[]>();
  for (const u of USERS) {
    const list = usersByAgency.get(u.primaryAgencyId ?? "") ?? [];
    list.push(u);
    usersByAgency.set(u.primaryAgencyId ?? "", list);
  }

  const MONTHS = 15;
  let counter = 0;
  for (let m = MONTHS - 1; m >= 0; m--) {
    // Léger effet de saisonnalité + croissance récente.
    const base = 8 + Math.round((MONTHS - m) * 0.6);
    const monthCount = between(r, base, base + 8);
    const monthStart = new Date(reference.getFullYear(), reference.getMonth() - m, 1);

    for (let i = 0; i < monthCount; i++) {
      const agency = pick(r, AGENCIES);
      const agents = usersByAgency.get(agency.id) ?? USERS;
      const manager = pick(r, agents);
      const status = pick(r, STATUS_POOL);

      const day = between(r, 1, 27);
      const createdAt = new Date(monthStart.getFullYear(), monthStart.getMonth(), day, 10, 0, 0);
      // Ne pas générer de dossiers dans le futur.
      if (createdAt > reference) continue;

      const amountBorrowed = between(r, 90_000, 480_000);
      // Commission courtier ~ 1 % du montant (bornée), arrondie à l'euro.
      const brokerCommission = Math.round(
        Math.min(6000, Math.max(1200, amountBorrowed * (0.009 + r() * 0.004))),
      );

      let signDate: string | null = null;
      if (SIGNED_STATUSES.has(status)) {
        // Signature 20 à 75 jours après création.
        const sign = new Date(createdAt);
        sign.setDate(sign.getDate() + between(r, 20, 75));
        if (sign <= reference) signDate = sign.toISOString();
      }

      cases.push({
        id: `case_${counter.toString().padStart(4, "0")}`,
        ref: `D-${createdAt.getFullYear()}-${(counter + 1000).toString()}`,
        status,
        agencyId: agency.id,
        agencyName: agency.name,
        managerId: manager.id,
        managerName: `${manager.firstName} ${manager.lastName}`,
        amountBorrowed,
        brokerCommission,
        createdAt: createdAt.toISOString(),
        signDate,
      });
      counter++;
    }
  }
  return cases;
}

export const mockActeloProvider: ActeloProvider = {
  kind: "mock",

  async listAgencies() {
    return AGENCIES.map((a) => ({ ...a }));
  },

  async listUsers(params) {
    const all = USERS.map((u) => ({ ...u }));
    if (params?.agencyId) {
      return all.filter((u) => u.agencyIds.includes(params.agencyId!));
    }
    return all;
  },

  async listCases(query: CaseQuery) {
    const all = buildCases(new Date());
    const fromMs = query.from.getTime();
    const toMs = query.to.getTime();
    // Un dossier est retenu s'il a été créé OU signé dans la fenêtre.
    return all.filter((c) => {
      const created = new Date(c.createdAt).getTime();
      const signed = c.signDate ? new Date(c.signDate).getTime() : null;
      const inCreated = created >= fromMs && created <= toMs;
      const inSigned = signed !== null && signed >= fromMs && signed <= toMs;
      return inCreated || inSigned;
    });
  },
};
