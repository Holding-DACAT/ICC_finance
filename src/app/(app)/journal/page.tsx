import { ScrollText } from "lucide-react";
import { redirect } from "next/navigation";

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
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ACTION_VARIANT = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "danger",
  VIEW: "neutral",
} as const;

export default async function JournalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Journal consultable par les administrateurs uniquement (RGPD).
  if (session.user.role !== "ADMIN") {
    return (
      <Section title="Journal d'audit" icon={ScrollText}>
        <p className="text-sm font-semibold text-state-warning">
          Accès réservé aux administrateurs.
        </p>
      </Section>
    );
  }

  let logs: {
    id: string;
    action: keyof typeof ACTION_VARIANT;
    entity: string;
    entityId: string | null;
    userId: string | null;
    createdAt: Date;
  }[] = [];
  let userEmailById = new Map<string, string>();
  let available = true;

  try {
    logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        createdAt: true,
      },
    });
    const userIds = [...new Set(logs.map((l) => l.userId).filter((x): x is string => Boolean(x)))];
    if (userIds.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      userEmailById = new Map(users.map((u) => [u.id, u.email]));
    }
  } catch {
    available = false;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Journal d&apos;audit</h1>
        <p className="text-sm text-text-soft">
          200 dernières opérations (création, modification, suppression, accès tracé).
        </p>
      </div>

      <Section title="Opérations récentes" icon={ScrollText}>
        {!available ? (
          <p className="text-sm font-semibold text-state-warning">
            Base de données non connectée.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Réf.</TableHead>
                <TableHead>Utilisateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-text-soft">
                    {l.createdAt.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[l.action]}>{l.action}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{l.entity}</TableCell>
                  <TableCell className="text-text-faint">{l.entityId ?? "—"}</TableCell>
                  <TableCell className="text-text-soft">
                    {l.userId ? (userEmailById.get(l.userId) ?? l.userId) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-6 text-center text-text-soft">
                    Aucune opération enregistrée.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
