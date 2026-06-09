import { CalendarX, FileText, Monitor, RefreshCw } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { getOverviewStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OrdinateursPage() {
  const s = await getOverviewStats();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Ordinateurs</h1>
        <p className="text-sm text-text-soft">Parc informatique du réseau.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Monitor} iconClassName="bg-kpi-orange" label="Attribués" value={s.computersAssigned} sub="Ordinateurs attribués à un utilisateur" />
        <KpiCard icon={FileText} iconClassName="bg-kpi-pink" label="Libres" value={s.computers - s.computersAssigned} sub="Ordinateurs non attribués" />
        <KpiCard icon={RefreshCw} iconClassName="bg-kpi-green" label="Total" value={s.computers} sub="Ordinateurs enregistrés" />
        <KpiCard icon={CalendarX} iconClassName="bg-kpi-blue" label="À renouveler" value={0} sub="Calcul d'âge au lot 3" />
      </div>
      <Section title="Ordinateurs" icon={Monitor}>
        <p className="text-sm text-text-soft">
          La liste (barre disque colorée, statut dérivé de l&apos;âge, attribution) est construite au{" "}
          <strong>lot&nbsp;3</strong>.
        </p>
      </Section>
    </div>
  );
}
