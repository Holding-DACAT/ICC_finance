import { Building2, Landmark, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { ActiveToggleButton } from "@/components/active-toggle-button";
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
import { auth } from "@/auth";
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Raison sociale</TableHead>
                <TableHead>Forme juridique</TableHead>
                <TableHead>SIREN</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Agences rattachées</TableHead>
                <TableHead>Membres</TableHead>
                <TableHead>Statut</TableHead>
                {canWrite ? <TableHead className="text-center">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {societes.map((s) => {
                const active = s.agencies.some((a) => a.status === "ACTIF");
                return (
                  <TableRow key={s.key}>
                    <TableCell className="font-bold">{s.legalName}</TableCell>
                    <TableCell className="text-text-soft">{s.legalForm ?? "—"}</TableCell>
                    <TableCell className="text-text-soft">{s.siren ?? "—"}</TableCell>
                    <TableCell className="text-text-soft">
                      <div>{s.phone ?? "—"}</div>
                      <div className="text-[11px] text-text-faint">{s.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.agencies.map((a) => (
                          <span
                            key={a.id}
                            className="rounded-md bg-brand-card-soft px-2 py-0.5 text-[11.5px]"
                          >
                            {a.name}
                            <span className="ml-1 text-text-faint">
                              {a.type === "FRANCHISE" ? "F" : "Fil."}
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{s.membersTotal}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? "success" : "danger"}>
                        {active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="text-center">
                        <ActiveToggleButton
                          agencyIds={s.agencies.map((a) => a.id)}
                          active={active}
                          scopeLabel={`la société « ${s.legalName} »`}
                          memberCount={s.membersTotal}
                          agencyCount={s.agencies.length}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
              {societes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={canWrite ? 8 : 7} className="py-6 text-center text-text-soft">
                    Aucune société.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        )}
      </Section>
    </div>
  );
}
