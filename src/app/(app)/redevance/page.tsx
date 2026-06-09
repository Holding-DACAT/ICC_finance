import { BadgeEuro } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { formatEur } from "@/lib/format";
import { getRedevanceData } from "@/lib/redevance";
import { RedevanceClient } from "./_components/redevance-client";

export const dynamic = "force-dynamic";

export default async function RedevancePage() {
  const { rows, totals, params, available } = await getRedevanceData();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Redevance info.</h1>
        <p className="text-sm text-text-soft">Redevances logicielles Silver / Gold par agence.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={BadgeEuro} iconClassName="bg-kpi-orange" label="Silver" value={totals.silver} sub="Nombre total de redevances Silver" />
        <KpiCard icon={BadgeEuro} iconClassName="bg-kpi-pink" label="Gold" value={totals.gold} sub="Nombre total de redevances Gold" />
        <KpiCard
          icon={BadgeEuro}
          iconClassName="bg-kpi-green"
          label="Moyenne / agence"
          value={
            <>
              <div>{formatEur(totals.avgPerAgencyHT)} HT</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {formatEur(totals.avgPerAgencyTTC)} TTC
              </div>
            </>
          }
          sub="Redevance agence moyenne (hors agences exclues)"
        />
        <KpiCard
          icon={BadgeEuro}
          iconClassName="bg-kpi-blue"
          label="Totale"
          value={
            <>
              <div>{formatEur(totals.totalHT)} HT</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {formatEur(totals.totalTTC)} TTC
              </div>
            </>
          }
          sub="Redevance totale"
        />
      </div>

      {available ? (
        <RedevanceClient rows={rows} params={params} />
      ) : (
        <Section title="Redevance informatique" icon={BadgeEuro}>
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
