import * as XLSX from "xlsx";

import { auth } from "@/auth";
import { formatMonth } from "@/lib/apporteur";
import { writeAudit } from "@/lib/audit";
import {
  CONVENTION_STATUS_LABELS,
  PAYMENT_MODE_LABELS,
  VERSEMENT_STATUS_LABELS,
  VERSEMENT_TYPE_LABELS,
} from "@/lib/labels";
import { canReadApporteurs, canSeeApporteurAmounts } from "@/lib/rbac";
import { getApporteursData } from "@/app/(app)/apporteurs/data";

export const dynamic = "force-dynamic";

/**
 * Export Excel du suivi des apporteurs, au format du classeur back-office
 * (une feuille « Versements », une feuille « Conventions »).
 * Réservé aux rôles habilités et tracé dans le journal d'audit (RGPD).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé.", { status: 401 });
  if (!canReadApporteurs(session.user.role)) {
    return new Response("Accès refusé.", { status: 403 });
  }
  if (!canSeeApporteurAmounts(session.user.role)) {
    // L'export porte les montants : réservé au back-office / administration.
    return new Response("Accès refusé : export réservé au back-office.", { status: 403 });
  }

  const param = new URL(request.url).searchParams.get("annee");
  const year = param && param !== "tous" ? Number.parseInt(param, 10) : null;
  const data = await getApporteursData(session.user, Number.isNaN(year as number) ? null : year);

  const versements = data.versements.map((v) => ({
    Société: v.companyName ?? "",
    Agence: v.agencyName ?? "",
    Commercial: v.commercialName,
    Type: VERSEMENT_TYPE_LABELS[v.type],
    Mois: formatMonth(v.month),
    Année: v.year,
    Apporteur: v.apporteurName,
    "N°SIREN kbis": v.sirenKbis ?? "",
    "N°SIREN facture": v.sirenInvoice ?? "",
    "Vérif signature convention": v.conventionStatus
      ? CONVENTION_STATUS_LABELS[v.conventionStatus]
      : "Absente",
    Dossiers: v.dossierLabel,
    Montant: v.amount ?? 0,
    "Mode paiement": PAYMENT_MODE_LABELS[v.paymentMode],
    Référence: v.paymentRef ?? "",
    Facture: v.invoiceReceived ? "OK" : "",
    "Date versement": v.paymentDate ? v.paymentDate.slice(0, 10) : "",
    "Vérif SIREN": v.sirenVerified ? "OUI" : "NON",
    "Commission perçue": v.commission ?? "",
    "Honoraires perçus": v.fees ?? "",
    "% CB": v.pctCommission ?? "",
    "% CA": v.pctFees ?? "",
    "Ristourne attendue": v.expectedAmount ?? "",
    Écart: v.deltaAmount ?? "",
    Statut: VERSEMENT_STATUS_LABELS[v.status],
    "Dossier Actelo": v.acteloCaseId ?? "",
  }));

  const conventions = data.apporteurs.flatMap((a) =>
    a.conventions.map((c) => ({
      Apporteur: a.name,
      Enseigne: a.enseigne ?? "",
      "N° convention": c.number ?? "",
      "Demandé par": c.requestedBy ?? "",
      "Date convention": c.conventionDate ? c.conventionDate.slice(0, 10) : "",
      Signature: CONVENTION_STATUS_LABELS[c.signatureStatus],
      "N° SIREN": a.siren ?? "",
      "Date kbis": c.kbisDate ? c.kbisDate.slice(0, 10) : "",
      "Titulaire(s)": c.holderName ?? "",
      Adresse: c.address ?? "",
      "Code Postal": c.postalCode ?? "",
      Ville: c.city ?? "",
      Rémunérations: c.remunerationLabel,
      "Société détentrice": c.companyName ?? "",
    })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(versements),
    year ? `Suivi apporteurs ${year}` : "Suivi apporteurs",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(conventions),
    "LISTE DES CONVENTIONS",
  );
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  await writeAudit({
    userId: session.user.id,
    action: "VIEW",
    entity: "ApporteurVersement",
    diff: {
      export: "xlsx",
      exercice: year ?? "tous",
      versements: versements.length,
      conventions: conventions.length,
      at: new Date().toISOString(),
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="suivi-apporteurs-${year ?? "complet"}-${stamp}.xlsx"`,
    },
  });
}
