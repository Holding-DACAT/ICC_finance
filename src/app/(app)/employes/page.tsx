import { UserX, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { EmployesClient } from "./_components/employes-client";
import { getEmployesData } from "./data";

export const dynamic = "force-dynamic";

export default async function EmployesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role } = session.user;
  const { members, agencies, kpis, available } = await getEmployesData(session.user);

  const canCreate = role === "ADMIN" || role === "RH";
  const canEdit = canCreate || role === "DIRECTEUR_AGENCE";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Employés</h1>
        <p className="text-sm text-text-soft">
          Membres du réseau (salariés, mandataires, franchisés, affiliés).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          icon={Users}
          iconClassName="bg-kpi-orange"
          label="Actifs"
          value={kpis.actifs}
          sub="Membres actuels du réseau"
        />
        <KpiCard
          icon={UserX}
          iconClassName="bg-kpi-pink"
          label="Inactifs"
          value={kpis.inactifs}
          sub="Anciens membres du réseau"
        />
      </div>

      {available ? (
        <EmployesClient
          members={members}
          agencies={agencies}
          canCreate={canCreate}
          canEdit={canEdit}
        />
      ) : (
        <Section title="Utilisateurs" icon={Users}>
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
