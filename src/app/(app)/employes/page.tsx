import { Building2, UserX, Users } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { getOverviewStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EmployesPage() {
  const s = await getOverviewStats();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Employés</h1>
        <p className="text-sm text-text-soft">Membres du réseau (salariés, mandataires, franchisés).</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} iconClassName="bg-kpi-orange" label="Actifs" value={s.membersActive} sub="Membres actuels du réseau" />
        <KpiCard icon={UserX} iconClassName="bg-kpi-pink" label="Inactifs" value={s.membersInactive} sub="Anciens membres du réseau" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-green" label="Total membres" value={s.members} sub="Tous statuts confondus" />
        <KpiCard icon={Users} iconClassName="bg-kpi-blue" label="Agences" value={s.agencies} sub="Agences de rattachement" />
      </div>
      <Section title="Utilisateurs" icon={Users}>
        <p className="text-sm text-text-soft">
          La liste complète (recherche, tri, pagination, filtres, fiche 360°, création/édition) est
          construite au <strong>lot&nbsp;1</strong>.
        </p>
      </Section>
    </div>
  );
}
