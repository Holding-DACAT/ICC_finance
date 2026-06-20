import { Building2, Landmark, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { SocieteClient } from "./_components/societe-client";
import { getSocietesData } from "./data";

export const dynamic = "force-dynamic";

export default async function SocietePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { societes, kpis, available } = await getSocietesData(session.user);
  const canWrite = session.user.role === "ADMIN" || session.user.role === "RH";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Société</h1>
        <p className="text-sm text-text-soft">
          Entités juridiques du réseau (raison sociale, forme juridique, SIREN) et agences rattachées.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={Landmark} iconClassName="bg-kpi-orange" label="Sociétés" value={kpis.societes} sub="Entités juridiques" />
        <KpiCard icon={Building2} iconClassName="bg-kpi-pink" label="Agences rattachées" value={kpis.agencies} sub="Toutes sociétés" />
        <KpiCard icon={Users} iconClassName="bg-kpi-green" label="Membres" value={kpis.members} sub="Toutes sociétés" />
      </div>

      <Section title="Sociétés du réseau" icon={Landmark}>
        {available ? (
          <SocieteClient societes={societes} canWrite={canWrite} />
        ) : (
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        )}
      </Section>
    </div>
  );
}
