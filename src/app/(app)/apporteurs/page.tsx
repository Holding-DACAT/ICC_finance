import { AlertTriangle, BadgeEuro, Clock, Handshake } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { formatEur } from "@/lib/format";
import { canReadApporteurs, canWriteApporteurs } from "@/lib/rbac";
import { ApporteursClient } from "./_components/apporteurs-client";
import { getApporteursData } from "./data";

export const dynamic = "force-dynamic";

/**
 * Suivi des apporteurs d'affaires (back-office) : conventions d'apport et
 * versements de ristourne. Accès restreint (cf. `lib/rbac`).
 */
export default async function ApporteursPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canReadApporteurs(session.user.role)) redirect("/");

  // `annee=tous` affiche l'historique complet ; sans paramètre : exercice courant.
  const { annee } = await searchParams;
  const parsedYear = annee ? Number.parseInt(annee, 10) : new Date().getFullYear();
  const year = annee === "tous" || Number.isNaN(parsedYear) ? null : parsedYear;

  const data = await getApporteursData(session.user, year);
  const canEdit = canWriteApporteurs(session.user.role);
  const { kpis } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Apporteurs</h1>
        <p className="text-sm text-text-soft">
          Conventions d&apos;apport et ristournes versées — suivi back-office
          {year ? ` · exercice ${year}` : " · tous exercices"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Handshake}
          iconClassName="bg-kpi-blue"
          label="Apporteurs actifs"
          value={kpis.apporteursActifs}
          sub="Partenaires apporteurs d'affaires"
        />
        <KpiCard
          icon={BadgeEuro}
          iconClassName="bg-kpi-green"
          label="Ristournes versées"
          value={kpis.totalVerse === null ? "—" : formatEur(kpis.totalVerse)}
          sub={year ? `Exercice ${year} (TTC)` : "Tous exercices (TTC)"}
        />
        <KpiCard
          icon={Clock}
          iconClassName="bg-kpi-orange"
          label="En attente de versement"
          value={
            kpis.encoursMontant === null
              ? kpis.encoursCount
              : `${kpis.encoursCount} · ${formatEur(kpis.encoursMontant)}`
          }
          sub="Ristournes dues, non versées"
        />
        <KpiCard
          icon={AlertTriangle}
          iconClassName="bg-kpi-pink"
          label="Points de contrôle"
          value={kpis.anomalies}
          sub={`${kpis.conventionsARegulariser} convention(s) à régulariser`}
        />
      </div>

      {data.available ? (
        <ApporteursClient
          apporteurs={data.apporteurs}
          versements={data.versements}
          companies={data.companies}
          agencies={data.agencies}
          years={data.years}
          selectedYear={data.selectedYear}
          canEdit={canEdit}
          canSeeAmounts={data.canSeeAmounts}
        />
      ) : (
        <Section title="Apporteurs" icon={Handshake}>
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
