import { auth } from "@/auth";
import { formatMonth, fromCents } from "@/lib/apporteur";
import { writeAudit } from "@/lib/audit";
import { formatDate, formatEur } from "@/lib/format";
import { PAYMENT_MODE_LABELS, VERSEMENT_TYPE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { canSeeApporteurAmounts } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/** Échappe une valeur avant insertion dans le document HTML. */
function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Note de ristourne (document à en-tête) prête à imprimer ou à enregistrer en
 * PDF depuis le navigateur. Réservée au back-office et tracée à l'audit.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé.", { status: 401 });
  if (!canSeeApporteurAmounts(session.user.role)) {
    return new Response("Accès refusé : document réservé au back-office.", { status: 403 });
  }

  const { id } = await context.params;
  const versement = await prisma.apporteurVersement.findUnique({
    where: { id },
    include: {
      apporteur: true,
      convention: true,
      company: true,
      agency: { select: { name: true } },
    },
  });
  if (!versement) return new Response("Versement introuvable.", { status: 404 });

  const { apporteur, convention, company } = versement;
  const amount = formatEur(fromCents(versement.amountCents));
  const emitter = company?.name ?? versement.companyLabel ?? "ICC Finance";
  const addressLines = [
    apporteur.address,
    [apporteur.postalCode, apporteur.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");

  const rows: [string, string][] = [
    ["Dossier", escapeHtml(versement.dossierLabel)],
    ["Période", `${formatMonth(versement.month)} ${versement.year}`],
    ["Nature", VERSEMENT_TYPE_LABELS[versement.type]],
    ["Convention", escapeHtml(convention?.remunerationLabel ?? "Non référencée")],
    ["Commercial", escapeHtml(versement.commercialName)],
    ["Mode de règlement", PAYMENT_MODE_LABELS[versement.paymentMode]],
    ["Référence de règlement", escapeHtml(versement.paymentRef)],
    ["Date de versement", formatDate(versement.paymentDate)],
  ];

  await writeAudit({
    userId: session.user.id,
    action: "VIEW",
    entity: "ApporteurVersement",
    entityId: versement.id,
    diff: { document: "note-ristourne" },
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Note de ristourne — ${escapeHtml(apporteur.name)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1b1f2a; font-size: 13px; margin: 0; padding: 24px; }
  .sheet { max-width: 780px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4338ca; padding-bottom: 12px; }
  .brand { font-size: 20px; font-weight: 800; color: #4338ca; }
  .muted { color: #5b6273; }
  h1 { font-size: 17px; margin: 26px 0 4px; }
  .party { margin-top: 18px; display: flex; justify-content: space-between; gap: 24px; }
  .party > div { flex: 1; }
  .label { text-transform: uppercase; letter-spacing: .06em; font-size: 10px; color: #5b6273; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e3e5ea; }
  th { width: 42%; color: #5b6273; font-weight: 600; }
  .total { margin-top: 18px; background: #f4f4fb; border: 1px solid #d9d9ee; border-radius: 8px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
  .total .amount { font-size: 22px; font-weight: 800; color: #4338ca; }
  footer { margin-top: 28px; font-size: 10.5px; color: #5b6273; border-top: 1px solid #e3e5ea; padding-top: 10px; }
  .print { margin-bottom: 16px; }
  button { background: #4338ca; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
  @media print { .print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="print"><button onclick="window.print()">Imprimer / enregistrer en PDF</button></div>
    <header>
      <div>
        <div class="brand">${escapeHtml(emitter)}</div>
        <div class="muted">Réseau ICC Finance — courtage en crédit immobilier</div>
      </div>
      <div class="muted">Édité le ${formatDate(new Date())}</div>
    </header>

    <h1>Note de ristourne d'apport d'affaires</h1>
    <div class="muted">Rétrocession versée au titre d'une convention d'apport.</div>

    <div class="party">
      <div>
        <div class="label">Bénéficiaire</div>
        <div><strong>${escapeHtml(apporteur.name)}</strong></div>
        ${apporteur.holderName ? `<div>${escapeHtml(apporteur.holderName)}</div>` : ""}
        ${addressLines}
        <div class="muted">SIREN ${escapeHtml(apporteur.siren)}</div>
      </div>
      <div>
        <div class="label">Émetteur</div>
        <div><strong>${escapeHtml(emitter)}</strong></div>
        ${versement.agency ? `<div>Agence ${escapeHtml(versement.agency.name)}</div>` : ""}
        ${company?.siren ? `<div class="muted">SIREN ${escapeHtml(company.siren)}</div>` : ""}
      </div>
    </div>

    <table>
      <tbody>
        ${rows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join("")}
      </tbody>
    </table>

    <div class="total">
      <span>Montant de la ristourne (TTC)</span>
      <span class="amount">${amount}</span>
    </div>

    <footer>
      Document interne établi à partir du suivi des apporteurs (outil GESTION RH — ICC Finance).
      Montant exprimé en TTC conformément à la convention d'apport.
      Il ne se substitue pas à la facture émise par l'apporteur.
    </footer>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
