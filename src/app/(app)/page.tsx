import { Bell, Building2, ClipboardList, Cog, Monitor, Search, Users } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getDashboardData } from "@/lib/dashboard";
import { RecruitmentChart } from "./_components/recruitment-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-text-soft">Vue d&apos;ensemble du réseau ICC Finance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          iconClassName="bg-kpi-orange"
          label="Membres du réseau"
          value={
            <>
              <div>{d.membersTotal} membres</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {d.iccDevMembers} ICC Dév.
              </div>
            </>
          }
          sub="Ressources humaines"
        />
        <KpiCard
          icon={Building2}
          iconClassName="bg-kpi-pink"
          label="Agences du réseau"
          value={
            <>
              <div>{d.agenciesFranchise} franchises</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {d.agenciesFiliale} filiales
              </div>
            </>
          }
          sub="Réseau d'agences"
        />
        <KpiCard
          icon={Monitor}
          iconClassName="bg-kpi-green"
          label="Parc informatique"
          value={
            <>
              <div>{d.computersTotal} ordinateurs</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {d.computersExpiringSoon} proches expiration
              </div>
            </>
          }
          sub="Résumé ordinateurs"
        />
        <KpiCard
          icon={Bell}
          iconClassName="bg-kpi-blue"
          label="Alertes ORIAS"
          value={
            <>
              <div className="text-[#FFD27A]">⚠ {d.oriasAlerts} en alerte</div>
              <div className="text-[12.5px] font-semibold text-text-soft">
                {d.oriasUpToDate} à jour
              </div>
            </>
          }
          sub="Résumé des alertes"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Section title="Recrutements (5 derniers mois + à venir)" icon={ClipboardList}>
          <RecruitmentChart data={d.recruitments} />
          <div className="mt-2 text-xs text-text-soft">
            Total : <strong>{d.totalRecruitments} recrutement(s)</strong> sur la période.
          </div>
        </Section>

        <Section title="Derniers ordinateurs masterisés" icon={Cog}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nom</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Enreg.</TableHead>
                <TableHead>Utilisateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.lastComputers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.name}</TableCell>
                  <TableCell className="text-text-soft">
                    {c.model}
                    <div className="text-[11px] text-text-faint">{c.serialNumber}</div>
                  </TableCell>
                  <TableCell className="text-text-soft">{formatDate(c.registrationDate)}</TableCell>
                  <TableCell>
                    {c.assignedMemberName ? (
                      <span className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]">
                        {c.assignedMemberName}
                      </span>
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {d.lastComputers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-6 text-center text-text-soft">
                    Aucun poste enregistré.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Section>
      </div>

      <Section title="Suivi du processus de création des nouveaux arrivants" icon={Search} accent="green">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Utilisateur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>MàJ le</TableHead>
              <TableHead>Avancement</TableHead>
              <TableHead>Dernière étape</TableHead>
              <TableHead>Prochaine étape</TableHead>
              <TableHead>Réalisée par</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.onboardings.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-bold">{o.memberName}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "TERMINE" ? "success" : "warning"}>
                    {o.status === "TERMINE" ? "TERMINÉ" : o.status === "EN_COURS" ? "EN COURS" : "AUCUN"}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-soft">{formatDate(o.updatedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-[90px] overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-state-success"
                        style={{
                          width: `${o.totalSteps ? (o.doneSteps / o.totalSteps) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11.5px] text-text-soft">
                      {o.doneSteps}/{o.totalSteps}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]">
                    {o.lastStep}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]">
                    {o.nextStep}
                  </span>
                </TableCell>
                <TableCell className="text-text-soft">{o.assignedTo}</TableCell>
              </TableRow>
            ))}
            {d.onboardings.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-6 text-center text-text-soft">
                  Aucun onboarding en cours.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}
