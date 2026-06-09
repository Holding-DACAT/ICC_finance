import { Building2 } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { getOverviewStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AgencesPage() {
  const s = await getOverviewStats();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Agences</h1>
        <p className="text-sm text-text-soft">Agences franchisées et filiales du réseau.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} iconClassName="bg-kpi-orange" label="Actives" value={s.agencies} sub="Agences actuelles du réseau" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-pink" label="Inactives" value={0} sub="Anciennes agences du réseau" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-green" label="Franchisées" value={s.agenciesFranchise} sub="Agences franchisées" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-blue" label="Affiliées" value={s.agenciesFiliale} sub="Agences filiales" />
      </div>
      <Section title="Agences" icon={Building2}>
        <p className="text-sm text-text-soft">
          La liste (directeurs multiples, raison sociale, fiche agence) est construite au{" "}
          <strong>lot&nbsp;2</strong>.
        </p>
      </Section>
    </div>
  );
}
