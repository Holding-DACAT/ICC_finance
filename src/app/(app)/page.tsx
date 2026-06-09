import { Bell, Building2, Monitor, Users } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { getOverviewStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await getOverviewStats();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-text-soft">Vue d&apos;ensemble du réseau ICC Finance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          iconClassName="bg-kpi-orange"
          label="Membres du réseau"
          value={
            <>
              <div>{s.members} membres</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {s.membersActive} actifs
              </div>
            </>
          }
          sub="Ressources humaines"
        />
        <KpiCard
          icon={Building2}
          iconClassName="bg-kpi-pink"
          label="Agences du réseau"
          value={
            <>
              <div>{s.agenciesFranchise} franchises</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {s.agenciesFiliale} filiales
              </div>
            </>
          }
          sub="Réseau d'agences"
        />
        <KpiCard
          icon={Monitor}
          iconClassName="bg-kpi-green"
          label="Parc informatique"
          value={
            <>
              <div>{s.computers} ordinateurs</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {s.computersAssigned} attribués
              </div>
            </>
          }
          sub="Résumé ordinateurs"
        />
        <KpiCard
          icon={Bell}
          iconClassName="bg-kpi-blue"
          label="Membres inactifs"
          value={s.membersInactive}
          sub="À surveiller"
        />
      </div>

      <Section title="Lot 0 — Fondations" icon={Bell}>
        <div className="space-y-2 text-sm text-text-soft">
          <p>
            Scaffold opérationnel : authentification {process.env.USE_INTEGRATION_MOCKS === "true"
              ? "en mode démo (mock Entra ID)"
              : "Microsoft Entra ID"}
            , thème indigo/orange, base Prisma et navigation.
          </p>
          {!s.available ? (
            <p className="font-semibold text-state-warning">
              Base de données non connectée : lancez la migration puis le seed (voir README).
            </p>
          ) : (
            <p>
              Base connectée et alimentée. Les écrans détaillés (Employés, Agences, Ordinateurs,
              Redevance) sont construits aux lots&nbsp;1 à&nbsp;5.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
