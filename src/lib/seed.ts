import type {
  AgencyType,
  ComplianceStatus,
  ContractType,
  MemberStatus,
  NetworkType,
  OnboardingStatus,
  OnboardingStepStatus,
  OriasCategory,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { ONBOARDING_STAGES } from "./onboarding-stages";

/* =========================================================================
   Données de démo — reprises du prototype reference/icc-finance-gestion-rh.jsx
   (cf. docs/02_MODELE_DONNEES.md §« Jeu de données de démo »).
   ========================================================================= */

const SILVER_HT = 58.33;
const GOLD_HT = 112.5;
const TVA_RATE = 0.2;

// Étapes par défaut de l'onboarding — source unique partagée avec le kanban.
const DEFAULT_ONBOARDING_STEPS = [...ONBOARDING_STAGES];

/** Agences : [nom, type, directeurs, raison sociale, forme juridique]. */
const AGENCIES: [string, "Franchise" | "Filiale", string[], string, string][] = [
  ["Agen & Miramont-de-Guyenne", "Franchise", ["Florent PETIT"], "Clape And Co-Consulting", "SAS"],
  ["Albi", "Franchise", ["Séverine BUENO GARCIA"], "SJG Finance", "SAS"],
  ["Bordeaux", "Filiale", ["Jean-Baptiste BOURIN"], "ICC Bordeaux", "SARL"],
  ["Colomiers", "Filiale", ["Damien CATALA", "Hugo CARIAT"], "ICC Finance", "SARL"],
  ["ICC Développement", "Filiale", ["Sylvain GOMEZ"], "ICC Développement", "SARL"],
  ["L'Union", "Filiale", ["Antoine LOUBIERE", "Hugo CARIAT"], "ICC Saint Jean", "SARL"],
  ["Labège", "Filiale", ["Laurent LABAU"], "ICC Labège", "SARL"],
  ["Montauban", "Franchise", ["Sébastien ASCARAT"], "Ascarat Conseil & Financement", "SARL"],
  ["Muret", "Filiale", ["Jérôme HILAIRE"], "ICC Muret", "SARL"],
  ["Perpignan", "Franchise", ["Julien COSTA"], "CC Crédit", "SAS"],
  ["Angoulême", "Franchise", ["Catherine BUTON"], "CB Patrimoine", "SAS"],
  ["Bayonne", "Filiale", ["Carole ETCHEVERRY"], "ICC Pays Basque", "SARL"],
];

/** Membres : [prénom, nom, contrat, fonction, sousFonction, orias, agence, réseau, arrivée, statut]. */
const MEMBERS: [string, string, string, string, string, string, string, string, string, string][] =
  [
    [
      "Anthony",
      "BAUCAL",
      "CDD",
      "Alternant",
      "Développeur",
      "",
      "ICC Développement",
      "Filiale",
      "2020-09-27",
      "actif",
    ],
    [
      "Anaïs",
      "BOGUENE",
      "Contrat de Mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Colomiers",
      "Filiale",
      "2021-07-11",
      "actif",
    ],
    [
      "Arnaud",
      "CHARPENTIER",
      "Contrat de Mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Colomiers",
      "Filiale",
      "2021-09-01",
      "actif",
    ],
    [
      "Axelle",
      "D'ORSO",
      "Contrat de mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Bordeaux",
      "Filiale",
      "2026-02-26",
      "inactif",
    ],
    [
      "Anaïs",
      "DAI-PRA",
      "CDI",
      "Salarié",
      "Responsable Administrative et Financière",
      "",
      "Colomiers",
      "Filiale",
      "2014-07-15",
      "actif",
    ],
    [
      "Alexia",
      "DENEGRE",
      "Contrat de Franchise",
      "Directrice d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Agen & Miramont-de-Guyenne",
      "Franchise",
      "2020-12-17",
      "actif",
    ],
    [
      "Arnaud",
      "DUMAS",
      "Contrat de Franchise",
      "Directeur d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Albi",
      "Franchise",
      "2018-12-14",
      "actif",
    ],
    [
      "Antoine",
      "FLORIAN",
      "Contrat de Mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Montauban",
      "Franchise",
      "2019-04-14",
      "inactif",
    ],
    [
      "Andréa",
      "GARROUSTE",
      "Contrat de Mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Muret",
      "Filiale",
      "2019-09-30",
      "actif",
    ],
    [
      "Valentin",
      "DESTRUEL",
      "Contrat de Mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Labège",
      "Filiale",
      "2022-11-03",
      "actif",
    ],
    [
      "Vincent",
      "GISQUET",
      "Contrat de Franchise",
      "Directeur d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Perpignan",
      "Franchise",
      "2017-06-09",
      "actif",
    ],
    [
      "Séverine",
      "BUENO GARCIA",
      "Contrat de Franchise",
      "Directrice d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Albi",
      "Franchise",
      "2016-03-21",
      "actif",
    ],
    [
      "Jean-Baptiste",
      "BOURIN",
      "CDI",
      "Directeur d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Bordeaux",
      "Filiale",
      "2015-01-12",
      "actif",
    ],
    [
      "Julien",
      "COSTA",
      "Contrat de Franchise",
      "Directeur d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Perpignan",
      "Franchise",
      "2021-05-04",
      "actif",
    ],
    [
      "Laurent",
      "LABAU",
      "CDI",
      "Directeur d'agence",
      "COBSP & COA",
      "COBSP, COA",
      "Labège",
      "Filiale",
      "2013-09-02",
      "actif",
    ],
    [
      "Marie",
      "FERRAND",
      "Contrat de Mandat",
      "Mandataire",
      "MIOBSP & MIA",
      "MIOBSP, MIA",
      "Bordeaux",
      "Filiale",
      "2023-02-15",
      "actif",
    ],
  ];

/** Heures de formation réalisées (réplique de la logique du prototype). */
const TRAINING_POOL = [6, 9, 12, 15, 4, 11, 15, 8];

/** Ordinateurs : [nom, modèle, série, enregistrement, dernière synchro, % disque, utilisateur "NOM Prénom"]. */
const COMPUTERS: [string, string, string, string, string, number, string][] = [
  [
    "DESKTOP-UOGNCMI",
    "HP EliteBook 850 G7 Notebook PC",
    "5CG0470C7N",
    "2023-03-22",
    "2023-07-26",
    91,
    "BAUCAL Anthony",
  ],
  [
    "DESKTOP-5R4TK2F",
    "HP EliteBook 850 G8 Notebook PC",
    "5CG22133NH",
    "2022-12-20",
    "2023-07-26",
    51,
    "BOGUENE Anaïs",
  ],
  [
    "DESKTOP-D9V22HO",
    "HP EliteBook 840 G6",
    "5CG0268V55",
    "2022-08-04",
    "2023-07-21",
    59,
    "CHARPENTIER Arnaud",
  ],
  [
    "DESKTOP-AL10836",
    "HP EliteBook 840 G6",
    "5CG03935V3",
    "2022-07-19",
    "2023-07-26",
    68,
    "DENEGRE Alexia",
  ],
  [
    "DESKTOP-1ARTE8F",
    "HP ZBook Power 15.6 G8 Mobile Workstation",
    "5CD2022GVV",
    "2022-07-13",
    "2023-07-26",
    57,
    "DUMAS Arnaud",
  ],
  [
    "DESKTOP-PH9L396",
    "HP EliteBook x360 830 G7 Notebook PC",
    "5CG124778Z",
    "2022-07-06",
    "2023-07-23",
    66,
    "GARROUSTE Andréa",
  ],
  [
    "DESKTOP-IKUJ3R3",
    "HP EliteBook 840 G6",
    "5CG938C7TF",
    "2022-03-01",
    "2023-07-26",
    33,
    "GISQUET Vincent",
  ],
  [
    "DESKTOP-9KKL9OJ",
    "HP EliteBook 850 G8 Notebook PC",
    "5CG125CDJK",
    "2022-02-28",
    "2023-07-26",
    65,
    "DESTRUEL Valentin",
  ],
  [
    "DESKTOP-386C60H",
    "HP EliteBook 850 G8 Notebook PC",
    "5CG1224CGM",
    "2022-02-04",
    "2023-07-21",
    44,
    "FERRAND Marie",
  ],
  [
    "DESKTOP-R410RLT",
    "HP EliteBook 850 G8 Notebook PC",
    "5CG1224K4S",
    "2022-01-25",
    "2023-07-26",
    28,
    "BOURIN Jean-Baptiste",
  ],
  [
    "DESKTOP-KBK6V76",
    "HP EliteBook 850 G8 Notebook PC",
    "5CG1350898",
    "2023-06-21",
    "2023-07-21",
    74,
    "DESTRUEL Valentin",
  ],
  [
    "DESKTOP-3NBDSR4",
    "HP EliteBook 850 G8 Notebook PC",
    "5CG221BSJ3",
    "2023-01-23",
    "2023-02-25",
    80,
    "GISQUET Vincent",
  ],
];

/** Compteurs de redevance par agence : [Silver, Gold]. */
const REDEVANCE_COUNTS: Record<string, [number, number]> = {
  "Agen & Miramont-de-Guyenne": [3, 0],
  Albi: [6, 0],
  Angoulême: [3, 1],
  Bayonne: [2, 3],
  Bordeaux: [8, 2],
  Colomiers: [14, 1],
  "ICC Développement": [4, 3],
  "L'Union": [5, 1],
  Labège: [4, 2],
  Montauban: [3, 1],
  Muret: [2, 0],
  Perpignan: [6, 2],
};

/** Processus d'onboarding (nouveaux arrivants). */
const ONBOARDINGS: { memberKey: string; status: OnboardingStatus; done: number }[] = [
  { memberKey: "FERRAND Marie", status: "EN_COURS", done: 2 },
  { memberKey: "DESTRUEL Valentin", status: "TERMINE", done: ONBOARDING_STAGES.length },
];

/* ------------------------------- utils ---------------------------------- */

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildEmail(firstName: string, lastName: string): string {
  return `${slug(firstName)}.${slug(lastName)}@icc-finance.fr`;
}

/** SIREN de démo : 9 chiffres déterministes dérivés d'une chaîne. */
function fakeSiren(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000_000;
  return String(100_000_000 + (h % 800_000_000));
}

/** Téléphone de démo (déterministe). */
function fakePhone(index: number): string {
  const n = (1234567 + index * 4321) % 10_000_000;
  const s = String(n).padStart(7, "0");
  return `05 ${s.slice(0, 1)}${s.slice(1, 2)} ${s.slice(2, 4)} ${s.slice(4, 6)} ${s.slice(6)}0`;
}

/** Adresse postale de démo (déterministe). */
function fakeAddress(index: number): string {
  const villes = ["Toulouse", "Colomiers", "Albi", "Bordeaux", "Muret", "Labège", "Perpignan"];
  return `${1 + ((index * 7) % 90)} rue des Courtiers, ${31000 + index} ${villes[index % villes.length]}`;
}

/** Date de naissance de démo (déterministe, adultes). */
function fakeBirthDate(index: number): Date {
  const year = 1975 + (index % 25);
  const month = 1 + (index % 12);
  const day = 1 + (index % 27);
  return new Date(year, month - 1, day);
}

function mapContract(c: string): ContractType {
  const v = c.toLowerCase();
  if (v.includes("mandat")) return "MANDAT";
  if (v.includes("franchise")) return "FRANCHISE";
  if (v.includes("cdd")) return "CDD";
  return "CDI";
}

function mapNetwork(n: string): NetworkType {
  return n === "Franchise" ? "FRANCHISE" : "FILIALE";
}

function mapAgencyType(t: string): AgencyType {
  return t === "Franchise" ? "FRANCHISE" : "FILIALE";
}

function mapStatus(s: string): MemberStatus {
  return s === "actif" ? "ACTIF" : "INACTIF";
}

function mapOriasCategories(orias: string): OriasCategory[] {
  if (!orias) return [];
  return orias
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean) as OriasCategory[];
}

/** Heures réalisées selon la fonction (réplique du prototype). */
function trainingHours(fonction: string, index: number): number {
  const eligible = fonction.includes("Mandataire") || fonction.includes("irecteur");
  return eligible ? TRAINING_POOL[index % TRAINING_POOL.length] : 0;
}

/* ----------------------------- seed principal --------------------------- */

export interface SeedSummary {
  agencies: number;
  members: number;
  computers: number;
  oriasRegistrations: number;
  trainings: number;
  onboardings: number;
  directors: number;
  users: number;
  settings: number;
}

/**
 * Réinitialise puis recharge le jeu de données de démo. Idempotent : peut être
 * relancé sans dupliquer (purge des tables métier avant insertion).
 */
export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
  // Toute la réinitialisation tient dans UNE transaction : TRUNCATE ... CASCADE
  // vide les tables métier de façon atomique (insensible à l'ordre des clés
  // étrangères) et son verrou exclusif sérialise deux exécutions concurrentes
  // (ex. double déclenchement du lien de seed). User/AuditLog ne sont PAS vidés.
  return prisma.$transaction((db) => seedWithin(db), {
    maxWait: 20000,
    timeout: 120000,
  });
}

async function seedWithin(db: Prisma.TransactionClient): Promise<SeedSummary> {
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE "TrainingSession", "Training", "OnboardingStep", "OnboardingProcess", "OriasRegistration", "Computer", "AgencyDirector", "Member", "Agency", "Setting" CASCADE`,
  );

  // --- Agences ---
  const agencyIdByName = new Map<string, string>();
  for (let i = 0; i < AGENCIES.length; i++) {
    const [name, type, , legalName, legalForm] = AGENCIES[i];
    const agency = await db.agency.create({
      data: {
        name,
        type: mapAgencyType(type),
        status: "ACTIF",
        legalName,
        legalForm,
        siren: fakeSiren(legalName),
        phone: fakePhone(i),
        email: `contact@${slug(legalName)}.fr`,
        redevanceExcluded: name === "ICC Développement",
      },
    });
    agencyIdByName.set(name, agency.id);
  }

  // --- Membres (+ ORIAS + formation) ---
  const memberIdByKey = new Map<string, string>(); // clé "NOM Prénom"
  let oriasCount = 0;
  let trainingCount = 0;
  for (let i = 0; i < MEMBERS.length; i++) {
    const [prenom, nom, contrat, fonction, sousFonction, orias, agence, reseau, arrivee, statut] =
      MEMBERS[i];
    const agencyId = agencyIdByName.get(agence)!;
    const categories = mapOriasCategories(orias);
    const hours = trainingHours(fonction, i);

    const isIndependent = mapContract(contrat) === "MANDAT" || mapContract(contrat) === "FRANCHISE";
    const member = await db.member.create({
      data: {
        firstName: prenom,
        lastName: nom,
        email: buildEmail(prenom, nom),
        birthDate: fakeBirthDate(i),
        postalAddress: fakeAddress(i),
        siren: isIndependent ? fakeSiren(`${nom}${prenom}`) : null,
        legalMentions: isIndependent
          ? `${prenom} ${nom} — entreprise individuelle, RCS Toulouse`
          : null,
        contractType: mapContract(contrat),
        functionTitle: fonction,
        functionSub: sousFonction || null,
        network: mapNetwork(reseau),
        status: mapStatus(statut),
        arrivalDate: new Date(arrivee),
        agencyId,
        orias: categories.length
          ? {
              create: {
                oriasNumber: `ORIAS-${slug(nom).toUpperCase().slice(0, 6)}`,
                oriasLogin: buildEmail(prenom, nom),
                oriasPassword: `Orias!${slug(nom).slice(0, 4)}2026`,
                categories,
                registrationDate: new Date(arrivee),
                renewalDate: new Date("2026-02-28"),
                status: "A_JOUR" as ComplianceStatus,
                rcProInsurer: "MMA",
                rcProPolicy: `POL-${slug(nom).toUpperCase().slice(0, 5)}-2026`,
                assocLogin: `${slug(prenom)}.${slug(nom)}`,
                assocPassword: `Assoc!${slug(nom).slice(0, 4)}2026`,
                capacityProOk: true,
                honorabilityOk: true,
              },
            }
          : undefined,
      },
    });
    memberIdByKey.set(`${nom} ${prenom}`, member.id);
    if (categories.length) oriasCount++;

    if (hours > 0) {
      await db.training.create({
        data: {
          memberId: member.id,
          year: 2026,
          requiredHours: 15,
          completedHours: hours,
        },
      });
      trainingCount++;
    }
  }

  // --- Ordinateurs ---
  let computerCount = 0;
  for (const [name, model, serial, reg, sync, disk, userKey] of COMPUTERS) {
    await db.computer.create({
      data: {
        name,
        model,
        serialNumber: serial,
        registrationDate: new Date(reg),
        lastSyncDate: new Date(sync),
        diskFreePct: disk,
        licenseTier: "SILVER",
        source: "seed",
        assignedMemberId: memberIdByKey.get(userKey) ?? null,
      },
    });
    computerCount++;
  }

  // --- Directeurs d'agence (liens N-N, uniquement pour les membres connus) ---
  let directorCount = 0;
  for (const [name, , directors] of AGENCIES) {
    const agencyId = agencyIdByName.get(name)!;
    for (const director of directors) {
      // Le prototype écrit les directeurs en "Prénom NOM" ; nos clés sont "NOM Prénom".
      const memberId = findMemberIdByDisplayName(memberIdByKey, director);
      if (!memberId) continue;
      await db.agencyDirector.create({ data: { agencyId, memberId } });
      directorCount++;
    }
  }

  // --- Onboarding (nouveaux arrivants) ---
  let onboardingCount = 0;
  for (const ob of ONBOARDINGS) {
    const memberId = memberIdByKey.get(ob.memberKey);
    if (!memberId) continue;
    await db.onboardingProcess.create({
      data: {
        memberId,
        status: ob.status,
        progress: Math.round((ob.done / DEFAULT_ONBOARDING_STEPS.length) * 100),
        steps: {
          create: DEFAULT_ONBOARDING_STEPS.map((label, idx) => ({
            label,
            order: idx + 1,
            status: (idx < ob.done ? "FAIT" : "A_FAIRE") as OnboardingStepStatus,
            doneAt: idx < ob.done ? new Date() : null,
          })),
        },
      },
    });
    onboardingCount++;
  }

  // --- Paramètres (redevance, onboarding) ---
  const settings: { key: string; value: unknown }[] = [
    { key: "redevance.silverHT", value: SILVER_HT },
    { key: "redevance.goldHT", value: GOLD_HT },
    { key: "redevance.tvaRate", value: TVA_RATE },
    { key: "redevance.seedCounts", value: REDEVANCE_COUNTS },
    { key: "onboarding.defaultSteps", value: DEFAULT_ONBOARDING_STEPS },
  ];
  for (const s of settings) {
    await db.setting.create({ data: { key: s.key, value: s.value as object } });
  }

  // --- Comptes applicatifs (upsert : conservés entre deux seeds) ---
  const appUsers: { email: string; name: string; role: "ADMIN" }[] = [
    { email: "admin@icc-finance.fr", name: "Administrateur ICC (démo)", role: "ADMIN" },
    { email: "damien.catala.diragce@axa.fr", name: "Damien Catala", role: "ADMIN" },
  ];
  for (const u of appUsers) {
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role },
    });
  }

  return {
    agencies: AGENCIES.length,
    members: MEMBERS.length,
    computers: computerCount,
    oriasRegistrations: oriasCount,
    trainings: trainingCount,
    onboardings: onboardingCount,
    directors: directorCount,
    users: appUsers.length,
    settings: settings.length,
  };
}

/** Retrouve un membre à partir d'un nom affiché "Prénom NOM(S)". */
function findMemberIdByDisplayName(
  memberIdByKey: Map<string, string>,
  displayName: string,
): string | undefined {
  const target = slug(displayName.split(/\s+/).sort().join(""));
  for (const [key, id] of memberIdByKey) {
    // key = "NOM Prénom" ; on compare indépendamment de l'ordre des mots.
    if (slug(key.split(/\s+/).sort().join("")) === target) return id;
  }
  return undefined;
}
