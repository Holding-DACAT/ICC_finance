import { BadgeEuro, Bell, GraduationCap, Monitor, ShieldCheck } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { getAlerts, type AlertItem } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  const a = await getAlerts();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Alertes</h1>
        <p className="text-sm text-text-soft">
          Échéances ORIAS / RC Pro, parc à renouveler, formation insuffisante.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ShieldCheck} iconClassName="bg-kpi-orange" label="ORIAS" value={a.orias.length} sub="Immatriculations en alerte" />
        <KpiCard icon={BadgeEuro} iconClassName="bg-kpi-pink" label="RC Pro" value={a.rcPro.length} sub="Responsabilités civiles à échéance" />
        <KpiCard icon={Monitor} iconClassName="bg-kpi-green" label="Parc" value={a.parc.length} sub="Postes à renouveler / expirés" />
        <KpiCard icon={GraduationCap} iconClassName="bg-kpi-blue" label="Formation" value={a.formation.length} sub="Heures de formation insuffisantes" />
      </div>

      <AlertSection title="Immatriculations ORIAS" items={a.orias} />
      <AlertSection title="RC Pro & garanties" items={a.rcPro} />
      <AlertSection title="Parc informatique" items={a.parc} />
      <AlertSection title="Formation continue" items={a.formation} />
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
