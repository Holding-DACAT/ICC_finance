import type { Prisma, Role } from "@prisma/client";

import {
  computeEcart,
  formatRemunerationRule,
  fromCents,
  ratio,
  type RemunerationRule,
} from "@/lib/apporteur";
import { prisma } from "@/lib/prisma";
import { canSeeApporteurAmounts } from "@/lib/rbac";
import type {
  AgencyOption,
  ApporteurDTO,
  ApporteurKpis,
  ApporteurOption,
  CompanyOption,
  ConventionDTO,
  VersementDTO,
  VersementFlag,
} from "./types";

/**
 * Accès aux données du module « Apporteurs ».
 *
 * Le périmètre est appliqué **côté serveur** : un directeur d'agence ne voit
 * que les versements rattachés à son agence, et sans les montants
 * (cf. CLAUDE.md §4 et `lib/rbac`).
 */

interface SessionUser {
  role: Role;
  scopedAgencyId: string | null;
}

const conventionSelect = {
  id: true,
  apporteurId: true,
  number: true,
  requestedBy: true,
  signatureStatus: true,
  conventionDate: true,
  kbisDate: true,
  holderName: true,
  address: true,
  postalCode: true,
  city: true,
  endDate: true,
  companyId: true,
  notes: true,
  remunerationType: true,
  remunerationRate: true,
  remunerationFixedCents: true,
  remunerationCapCents: true,
  remunerationBase: true,
  remunerationLabel: true,
  company: { select: { name: true } },
} satisfies Prisma.ApporteurConventionSelect;

type ConventionRow = Prisma.ApporteurConventionGetPayload<{ select: typeof conventionSelect }>;

/** Règle structurée telle que stockée en base. */
export function ruleFromConvention(c: {
  remunerationType: ConventionRow["remunerationType"];
  remunerationRate: number | null;
  remunerationFixedCents: number | null;
  remunerationCapCents: number | null;
  remunerationBase: ConventionRow["remunerationBase"];
}): RemunerationRule {
  return {
    type: c.remunerationType,
    rate: c.remunerationRate,
    fixedCents: c.remunerationFixedCents,
    capCents: c.remunerationCapCents,
    base: c.remunerationBase,
  };
}

function toConventionDTO(c: ConventionRow): ConventionDTO {
  const rule = ruleFromConvention(c);
  return {
    id: c.id,
    apporteurId: c.apporteurId,
    number: c.number,
    requestedBy: c.requestedBy,
    signatureStatus: c.signatureStatus,
    conventionDate: c.conventionDate?.toISOString() ?? null,
    kbisDate: c.kbisDate?.toISOString() ?? null,
    holderName: c.holderName,
    address: c.address,
    postalCode: c.postalCode,
    city: c.city,
    endDate: c.endDate?.toISOString() ?? null,
    companyId: c.companyId,
    companyName: c.company?.name ?? null,
    notes: c.notes,
    remunerationType: c.remunerationType,
    remunerationRate: c.remunerationRate,
    remunerationFixed: c.remunerationFixedCents === null ? null : fromCents(c.remunerationFixedCents),
    remunerationCap: c.remunerationCapCents === null ? null : fromCents(c.remunerationCapCents),
    remunerationBase: c.remunerationBase,
    remunerationLabel: c.remunerationLabel ?? formatRemunerationRule(rule),
  };
}

/** Convention de référence : la plus récente non résiliée, sinon la plus récente. */
function pickActiveConvention(conventions: ConventionDTO[]): ConventionDTO | null {
  if (conventions.length === 0) return null;
  const active = conventions.filter((c) => c.signatureStatus !== "RESILIEE");
  return (active.length > 0 ? active : conventions)[0] ?? null;
}

export interface ApporteursData {
  available: boolean;
  apporteurs: ApporteurDTO[];
  versements: VersementDTO[];
  kpis: ApporteurKpis;
  years: number[];
  selectedYear: number | null;
  companies: CompanyOption[];
  agencies: AgencyOption[];
  apporteurOptions: ApporteurOption[];
  canSeeAmounts: boolean;
}

const EMPTY_KPIS: ApporteurKpis = {
  apporteursActifs: 0,
  totalVerse: 0,
  encoursCount: 0,
  encoursMontant: 0,
  conventionsARegulariser: 0,
  anomalies: 0,
};

/**
 * Données de l'écran « Apporteurs » pour un exercice donné.
 * @param year année civile des versements (null = tous les exercices).
 */
export async function getApporteursData(
  user: SessionUser,
  year: number | null,
): Promise<ApporteursData> {
  const showAmounts = canSeeApporteurAmounts(user.role);
  const currentYear = new Date().getFullYear();
  const scoped = user.role === "DIRECTEUR_AGENCE" ? user.scopedAgencyId : null;

  try {
    const versementWhere: Prisma.ApporteurVersementWhereInput = {
      ...(year ? { year } : {}),
      ...(user.role === "DIRECTEUR_AGENCE" ? { agencyId: scoped ?? "__aucune__" } : {}),
    };

    const [apporteurRows, versementRows, distinctYears, companies, agencies] = await Promise.all([
      prisma.apporteur.findMany({
        orderBy: { name: "asc" },
        include: {
          company: { select: { name: true } },
          conventions: {
            select: conventionSelect,
            orderBy: [{ conventionDate: "desc" }, { createdAt: "desc" }],
          },
          versements: {
            select: { amountCents: true, paymentDate: true, status: true },
          },
        },
      }),
      prisma.apporteurVersement.findMany({
        where: versementWhere,
        orderBy: [{ year: "desc" }, { paymentDate: "desc" }, { dossierLabel: "asc" }],
        include: {
          apporteur: { select: { name: true, siren: true, kbisDate: true } },
          convention: { select: conventionSelect },
          company: { select: { name: true } },
          agency: { select: { name: true } },
        },
      }),
      prisma.apporteurVersement.findMany({
        distinct: ["year"],
        select: { year: true },
        orderBy: { year: "desc" },
      }),
      prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.agency.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

    const apporteurs: ApporteurDTO[] = apporteurRows.map((a) => {
      const conventions = a.conventions.map(toConventionDTO);
      const paid = a.versements.filter((v) => v.status === "VERSE");
      const totalPaidCents = paid.reduce((sum, v) => sum + v.amountCents, 0);
      const lastPayment = paid
        .map((v) => v.paymentDate)
        .filter((d): d is Date => Boolean(d))
        .sort((x, y) => y.getTime() - x.getTime())[0];
      return {
        id: a.id,
        name: a.name,
        siren: a.siren,
        enseigne: a.enseigne,
        holderName: a.holderName,
        email: a.email,
        phone: a.phone,
        address: a.address,
        postalCode: a.postalCode,
        city: a.city,
        kbisDate: a.kbisDate?.toISOString() ?? null,
        ribReceived: a.ribReceived,
        status: a.status,
        companyId: a.companyId,
        companyName: a.company?.name ?? null,
        notes: a.notes,
        conventions,
        activeConvention: pickActiveConvention(conventions),
        versementCount: a.versements.length,
        totalPaid: showAmounts ? fromCents(totalPaidCents) : null,
        lastPaymentDate: lastPayment?.toISOString() ?? null,
      };
    });

    const conventionByApporteur = new Map(apporteurs.map((a) => [a.id, a.activeConvention]));

    const versements: VersementDTO[] = versementRows.map((v) => {
      const convention = v.convention
        ? toConventionDTO(v.convention)
        : conventionByApporteur.get(v.apporteurId) ?? null;
      const rule = convention
        ? {
            type: convention.remunerationType,
            rate: convention.remunerationRate,
            fixedCents:
              convention.remunerationFixed === null ? null : Math.round(convention.remunerationFixed * 100),
            capCents:
              convention.remunerationCap === null ? null : Math.round(convention.remunerationCap * 100),
            base: convention.remunerationBase,
          }
        : null;
      const ecart = computeEcart(
        rule,
        { commissionCents: v.commissionCents, feesCents: v.feesCents },
        v.amountCents,
      );

      const flags: VersementFlag[] = [];
      const active = v.status !== "ANNULE";
      // Les contrôles de dossier (SIREN, kbis) ne portent que sur les exercices
      // récents : les exercices clos ne sont plus régularisables.
      const recent = v.year >= currentYear - 1;
      if (!convention) flags.push("CONVENTION_MANQUANTE");
      else if (convention.signatureStatus !== "SIGNEE") flags.push("CONVENTION_NON_SIGNEE");
      if (v.status === "A_VERSER") flags.push("RISTOURNE_NON_VERSEE");
      if (active && recent && !v.sirenVerified) flags.push("SIREN_NON_VERIFIE");
      if (active && recent && !v.apporteur.kbisDate) flags.push("KBIS_MANQUANT");
      if (active && ecart.isAnomaly) flags.push("ECART_CONVENTION");

      return {
        id: v.id,
        apporteurId: v.apporteurId,
        apporteurName: v.apporteur.name,
        apporteurSiren: v.apporteur.siren,
        conventionId: v.conventionId,
        conventionStatus: convention?.signatureStatus ?? null,
        conventionRule: convention?.remunerationLabel ?? null,
        companyId: v.companyId,
        companyName: v.company?.name ?? v.companyLabel,
        agencyId: v.agencyId,
        agencyName: v.agency?.name ?? null,
        commercialName: v.commercialName,
        memberId: v.memberId,
        type: v.type,
        year: v.year,
        month: v.month,
        dossierLabel: v.dossierLabel,
        acteloCaseId: v.acteloCaseId,
        amount: showAmounts ? fromCents(v.amountCents) : null,
        commission: showAmounts ? (v.commissionCents === null ? null : fromCents(v.commissionCents)) : null,
        fees: showAmounts ? (v.feesCents === null ? null : fromCents(v.feesCents)) : null,
        paymentMode: v.paymentMode,
        paymentRef: v.paymentRef,
        invoiceReceived: v.invoiceReceived,
        paymentDate: v.paymentDate?.toISOString() ?? null,
        sirenKbis: v.sirenKbis,
        sirenInvoice: v.sirenInvoice,
        sirenVerified: v.sirenVerified,
        status: v.status,
        notes: v.notes,
        pctCommission: showAmounts ? ratio(v.amountCents, v.commissionCents) : null,
        pctFees: showAmounts ? ratio(v.amountCents, v.feesCents) : null,
        expectedAmount: showAmounts && ecart.expectedCents !== null ? fromCents(ecart.expectedCents) : null,
        deltaAmount: showAmounts && ecart.deltaCents !== null ? fromCents(ecart.deltaCents) : null,
        flags,
      };
    });

    const verseCents = versementRows
      .filter((v) => v.status === "VERSE")
      .reduce((sum, v) => sum + v.amountCents, 0);
    const encours = versementRows.filter((v) => v.status === "A_VERSER");

    const kpis: ApporteurKpis = {
      apporteursActifs: apporteurs.filter((a) => a.status === "ACTIF").length,
      totalVerse: showAmounts ? fromCents(verseCents) : null,
      encoursCount: encours.length,
      encoursMontant: showAmounts
        ? fromCents(encours.reduce((sum, v) => sum + v.amountCents, 0))
        : null,
      conventionsARegulariser: apporteurs.filter(
        (a) => !a.activeConvention || a.activeConvention.signatureStatus !== "SIGNEE",
      ).length,
      anomalies: versements.filter((v) => v.flags.length > 0).length,
    };

    return {
      available: true,
      apporteurs,
      versements,
      kpis,
      years: distinctYears.map((y) => y.year),
      selectedYear: year,
      companies,
      agencies,
      apporteurOptions: apporteurs.map((a) => ({ id: a.id, name: a.name, siren: a.siren })),
      canSeeAmounts: showAmounts,
    };
  } catch {
    // Base indisponible (build, migration non appliquée) : écran dégradé.
    return {
      available: false,
      apporteurs: [],
      versements: [],
      kpis: EMPTY_KPIS,
      years: [],
      selectedYear: year,
      companies: [],
      agencies: [],
      apporteurOptions: [],
      canSeeAmounts: showAmounts,
    };
  }
}
