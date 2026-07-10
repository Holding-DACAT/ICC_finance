import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { AgencesClient } from "./_components/agences-client";
import { getAgencesData } from "./data";

export const dynamic = "force-dynamic";

export default async function AgencesPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { focus } = await searchParams;
  const { agencies, memberOptions, companyOptions, kpis, available } = await getAgencesData(
    session.user,
  );
  const canWrite = session.user.role === "ADMIN" || session.user.role === "RH";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Agences</h1>
        <p className="text-sm text-text-soft">Agences franchisées et filiales du réseau.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} iconClassName="bg-kpi-orange" label="Actives" value={kpis.actives} sub="Agences actuelles du réseau" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-pink" label="Inactives" value={kpis.inactives} sub="Anciennes agences du réseau" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-green" label="Franchisées" value={kpis.franchises} sub="Agences franchisées" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-blue" label="Affiliées" value={kpis.filiales} sub="Agences filiales" />
      </div>

      {available ? (
        <AgencesClient
          agencies={agencies}
          memberOptions={memberOptions}
          companyOptions={companyOptions}
          canWrite={canWrite}
          initialFocusId={focus}
        />
      ) : (
        <Section title="Agences" icon={Building2}>
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
