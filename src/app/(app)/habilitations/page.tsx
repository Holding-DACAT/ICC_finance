import { ShieldAlert, ShieldCheck, ShieldX, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { getHabilitationsData } from "@/lib/habilitation";
import { HabilitationsClient } from "./_components/habilitations-client";

export const dynamic = "force-dynamic";

export default async function HabilitationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { rows, kpis, year, available } = await getHabilitationsData(session.user);
  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "RH" ||
    session.user.role === "DIRECTEUR_AGENCE";

  if (available) {
    await writeAudit({
      userId: session.user.id,
      action: "VIEW",
      entity: "Habilitation",
      diff: { count: rows.length },
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Habilitations</h1>
        <p className="text-sm text-text-soft">
          Habilitation des équipes (ORIAS, RC Pro, garantie financière). Le statut d&apos;habilitation
          est remis à zéro chaque 1<sup>er</sup> janvier.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          iconClassName="bg-kpi-blue"
          label="Habilitations"
          value={kpis.total}
          sub="Membres habilités du réseau"
        />
        <KpiCard
          icon={ShieldCheck}
          iconClassName="bg-kpi-green"
          label={`Validées ${year}`}
          value={kpis.validees}
          sub="Habilitations validées pour l'année"
        />
        <KpiCard
          icon={ShieldAlert}
          iconClassName="bg-kpi-orange"
          label="À valider"
          value={kpis.aValider}
          sub="Habilitations remises à zéro à confirmer"
        />
        <KpiCard
          icon={ShieldX}
          iconClassName="bg-kpi-pink"
          label="ORIAS expiré"
          value={kpis.expirees}
          sub="Immatriculations ORIAS expirées"
        />
      </div>

      {available ? (
        <HabilitationsClient rows={rows} year={year} canEdit={canEdit} />
      ) : (
        <Section title="Habilitations" icon={ShieldCheck}>
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
