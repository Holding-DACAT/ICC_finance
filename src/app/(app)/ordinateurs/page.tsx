import { CalendarX, FileText, Monitor, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { OrdinateursClient } from "./_components/ordinateurs-client";
import { getOrdinateursData } from "./data";

export const dynamic = "force-dynamic";

export default async function OrdinateursPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { focus } = await searchParams;
  const { computers, memberOptions, agencyOptions, kpis, available } = await getOrdinateursData(
    session.user,
  );
  const canWrite = session.user.role === "ADMIN" || session.user.role === "IT";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Ordinateurs</h1>
        <p className="text-sm text-text-soft">Parc informatique du réseau.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Monitor} iconClassName="bg-kpi-orange" label="Attribués" value={kpis.assigned} sub="Ordinateurs attribués à un utilisateur" />
        <KpiCard icon={FileText} iconClassName="bg-kpi-pink" label="Libres" value={kpis.free} sub="Ordinateurs non attribués" />
        <KpiCard icon={RefreshCw} iconClassName="bg-kpi-green" label="À renouveler" value={kpis.toRenew} sub="Ordinateurs de plus de 34 mois" />
        <KpiCard icon={CalendarX} iconClassName="bg-kpi-blue" label="Expirés" value={kpis.expired} sub="Ordinateurs de plus de 36 mois" />
      </div>

      {available ? (
        <OrdinateursClient
          computers={computers}
          memberOptions={memberOptions}
          agencyOptions={agencyOptions}
          canWrite={canWrite}
          initialFocusId={focus}
        />
      ) : (
        <Section title="Ordinateurs" icon={Monitor}>
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
