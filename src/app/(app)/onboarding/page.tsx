import { KanbanSquare } from "lucide-react";
import { redirect } from "next/navigation";

import { Section } from "@/components/section";
import { auth } from "@/auth";
import { getEmployesData } from "@/app/(app)/employes/data";
import { getOnboardingBoard } from "@/lib/onboarding";
import { OnboardingBoard } from "./_components/onboarding-board";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [board, employes] = await Promise.all([
    getOnboardingBoard(),
    getEmployesData(session.user),
  ]);
  const role = session.user.role;
  const canWrite = role === "ADMIN" || role === "RH";
  const canEditMembers = canWrite || role === "DIRECTEUR_AGENCE";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Onboarding</h1>
        <p className="text-sm text-text-soft">
          Suivi de l&apos;intégration des nouveaux collaborateurs.
        </p>
      </div>

      {board.available ? (
        <OnboardingBoard
          stages={board.stages}
          columns={board.columns}
          cards={board.cards}
          canWrite={canWrite}
          members={employes.members}
          agencies={employes.agencies}
          companies={employes.companies}
          canEditMembers={canEditMembers}
        />
      ) : (
        <Section title="Onboarding" icon={KanbanSquare} accent="green">
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée : lancez la migration puis le seed (voir README).
          </p>
        </Section>
      )}
    </div>
  );
}
