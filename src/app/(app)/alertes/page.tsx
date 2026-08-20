import { BadgeEuro, Bell, GraduationCap, Handshake, Monitor, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { getAlerts, type AlertItem } from "@/lib/alerts";
import { canReadApporteurs } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Les contrôles apporteurs ne sont calculés que pour les rôles habilités.
  const showApporteurs = canReadApporteurs(session.user.role);
  const a = await getAlerts({ includeApporteurs: showApporteurs });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Alertes</h1>
        <p className="text-sm text-text-soft">
          Échéances ORIAS / RC Pro, parc à renouveler, formation insuffisante.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {showApporteurs ? (
          <KpiCard
            icon={Handshake}
            iconClassName="bg-kpi-blue"
            label="Apporteurs"
            value={a.apporteurs.length}
            sub="Conventions, versements et contrôles SIREN"
          />
        ) : null}
        <KpiCard icon={ShieldCheck} iconClassName="bg-kpi-orange" label="ORIAS" value={a.orias.length} sub="Immatriculations en alerte" />
        <KpiCard icon={BadgeEuro} iconClassName="bg-kpi-pink" label="RC Pro" value={a.rcPro.length} sub="Responsabilités civiles à échéance" />
        <KpiCard icon={Monitor} iconClassName="bg-kpi-green" label="Parc" value={a.parc.length} sub="Postes à renouveler / expirés" />
        <KpiCard icon={GraduationCap} iconClassName="bg-kpi-blue" label="Formation" value={a.formation.length} sub="Heures de formation insuffisantes" />
      </div>

      <AlertSection title="Immatriculations ORIAS" items={a.orias} />
      <AlertSection title="RC Pro & garanties" items={a.rcPro} />
      <AlertSection title="Parc informatique" items={a.parc} />
      <AlertSection title="Formation continue" items={a.formation} />
      {showApporteurs ? (
        <AlertSection title="Apporteurs d'affaires" items={a.apporteurs} />
      ) : null}
    </div>
  );
}

function AlertSection({ title, items }: { title: string; items: AlertItem[] }) {
  return (
    <Section title={title} icon={Bell}>
      {items.length === 0 ? (
        <p className="text-sm text-text-soft">Aucune alerte.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm"
            >
              <div>
                <span className="font-semibold">{it.subject}</span>
                <span className="text-text-soft"> — {it.detail}</span>
              </div>
              <Badge variant={it.severity === "danger" ? "danger" : "warning"}>
                {it.severity === "danger" ? "URGENT" : "À TRAITER"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
