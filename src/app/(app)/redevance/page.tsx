import { BadgeEuro } from "lucide-react";

import { Section } from "@/components/section";

export const dynamic = "force-dynamic";

export default function RedevancePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Redevance info.</h1>
        <p className="text-sm text-text-soft">Redevances logicielles Silver / Gold par agence.</p>
      </div>
      <Section title="Redevance informatique" icon={BadgeEuro}>
        <p className="text-sm text-text-soft">
          Le tableau par agence (colonnes Silver/Gold/Moyenne/Total, calculs HT/TTC, export) est
          construit au <strong>lot&nbsp;4</strong>. Les paramètres (prix Silver&nbsp;58,33&nbsp;€,
          Gold&nbsp;112,50&nbsp;€ HT, TVA&nbsp;20&nbsp;%) sont déjà chargés via le seed.
        </p>
      </Section>
    </div>
  );
}
