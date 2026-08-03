import { redirect } from "next/navigation";
import { BadgeEuro, FileText, Landmark, LineChart, Percent, Target, Trophy } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { formatEur } from "@/lib/format";
import { getPilotageData, parseFilters, type StatusSlice } from "@/lib/pilotage";
import { PilotageFilters } from "./_components/pilotage-filters";
import { PilotageChart } from "./_components/pilotage-chart";
import { LeaderboardTable } from "./_components/leaderboard-table";
import { ObjectiveDialog } from "./_components/objective-dialog";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)} %`;
const compactEur = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000).toLocaleString("fr-FR")} k€` : formatEur(n);

export default async function PilotagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const filters = parseFilters(await searchParams);
  const d = await getPilotageData(filters, session.user);
  const canSetObjectives = session.user.role === "ADMIN" || session.user.role === "RH";
  const currentYear = new Date(d.period.from).getFullYear();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Pilotage commercial</h1>
          <p className="text-sm text-text-soft">
            Production et chiffre d&apos;affaires du réseau — {d.period.label.toLowerCase()}.
          </p>
        </div>
        {!d.live ? (
          <span className="rounded-full border border-state-warning/40 bg-state-warning/10 px-3 py-1 text-[11.5px] font-semibold text-state-warning">
            Données de démonstration (API Actelo non connectée)
          </span>
        ) : null}
      </div>

      {/* Filtres */}
      <div className="rounded-xl bg-card p-4 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        <PilotageFilters
          period={d.period.key}
          agencyId={d.filters.agencyId}
          collaboratorId={d.filters.collaboratorId}
          agencies={d.agencies}
          collaborators={d.collaborators}
          lockedAgencyId={d.lockedAgencyId}
        />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FileText}
          iconClassName="bg-kpi-blue"
          label="Dossiers"
          value={
            <>
              <div>{d.kpis.dossiersTotal} dossiers</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {d.kpis.dossiersEnCours} en cours · {d.kpis.dossiersFinances} financés
              </div>
            </>
          }
          sub="Sur la période"
        />
        <KpiCard
          icon={BadgeEuro}
          iconClassName="bg-kpi-orange"
          label="CA / commissions"
          value={compactEur(d.kpis.caCommissions)}
          sub={`Pipeline : ${compactEur(d.kpis.caPipeline)}`}
        />
        <KpiCard
          icon={Landmark}
          iconClassName="bg-kpi-green"
          label="Volume financé"
          value={compactEur(d.kpis.volumeFinance)}
          sub="Montant des crédits signés"
        />
        <KpiCard
          icon={Percent}
          iconClassName="bg-kpi-pink"
          label="Taux de transformation"
          value={pct(d.kpis.tauxTransformation)}
          sub="Financés / dossiers créés"
        />
      </div>

      {/* Graphique + répartition statuts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Section title="Évolution — dossiers & CA" icon={LineChart}>
          <PilotageChart data={d.series} />
          <div className="mt-2 flex items-center gap-4 text-[11.5px] text-text-soft">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-kpi-blue" /> Dossiers créés
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-4 rounded bg-kpi-orange" /> CA / commissions
            </span>
            <span className="ml-auto text-text-faint">
              Granularité {d.period.granularity}
            </span>
          </div>
        </Section>

        <Section title="Répartition des dossiers" icon={FileText} accent="green">
          <StatusBreakdown slices={d.statusBreakdown} total={d.kpis.dossiersTotal} />
        </Section>
      </div>

      {/* Objectifs */}
      <Section
        title="Objectifs vs réalisé"
        icon={Target}
        action={
          canSetObjectives ? (
            <ObjectiveDialog
              agencies={d.agencies}
              collaborators={d.collaborators}
              defaultYear={currentYear}
            />
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ObjectiveGauge
            label="Nombre de dossiers"
            current={d.kpis.dossiersTotal}
            target={d.objective.targetCases}
            attainment={d.objective.attainmentCases}
            format={(n) => `${n}`}
          />
          <ObjectiveGauge
            label="CA / commissions"
            current={d.kpis.caCommissions}
            target={d.objective.targetRevenue}
            attainment={d.objective.attainmentRevenue}
            format={compactEur}
          />
        </div>
        {d.objective.source === "indicative" ? (
          <p className="mt-4 text-[11.5px] text-text-faint">
            Objectif indicatif (aucun objectif défini pour ce périmètre).
            {canSetObjectives ? " Cliquez sur « Définir un objectif » pour fixer une cible." : ""}
          </p>
        ) : null}
      </Section>

      {/* Leaderboard */}
      <Section title="Classement des collaborateurs" icon={Trophy}>
        <LeaderboardTable rows={d.leaderboard} />
      </Section>
    </div>
  );
}

// --- Sous-composants serveur (markup pur) ----------------------------------

const STATUS_COLORS: Record<string, string> = {
  EN_COURS: "bg-kpi-blue",
  ACCEPTE_FINANCE: "bg-state-success",
  REFUSE: "bg-state-danger",
  ABANDONNE: "bg-state-warning",
};

function StatusBreakdown({ slices, total }: { slices: StatusSlice[]; total: number }) {
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-text-soft">Aucun dossier sur la période.</p>;
  }
  return (
    <div className="space-y-3.5">
      {slices.map((s) => {
        const share = total > 0 ? s.count / total : 0;
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="font-semibold">{s.label}</span>
              <span className="text-text-soft">
                {s.count} <span className="text-text-faint">({Math.round(share * 100)} %)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${STATUS_COLORS[s.key] ?? "bg-primary"}`}
                style={{ width: `${Math.max(share * 100, s.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ObjectiveGauge({
  label,
  current,
  target,
  attainment,
  format,
}: {
  label: string;
  current: number;
  target: number;
  attainment: number;
  format: (n: number) => string;
}) {
  const pctVal = Math.min(Math.round(attainment * 100), 100);
  const reached = attainment >= 1;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-semibold">{label}</span>
        <span className={`text-sm font-extrabold ${reached ? "text-state-success" : "text-text-soft"}`}>
          {Math.round(attainment * 100)} %
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${reached ? "bg-state-success" : "bg-primary"}`}
          style={{ width: `${Math.max(pctVal, current > 0 ? 3 : 0)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-text-faint">
        <span>
          Réalisé : <strong className="text-text-soft">{format(current)}</strong>
        </span>
        <span>Objectif : {format(target)}</span>
      </div>
    </div>
  );
}
