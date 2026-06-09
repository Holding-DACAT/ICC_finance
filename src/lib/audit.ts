import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Journal d'audit (cf. CLAUDE.md §4) : trace toute création / modification /
 * suppression et tout accès à une fiche. À appeler côté serveur uniquement.
 */
export async function writeAudit(params: {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  diff?: Prisma.InputJsonValue;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        diff: params.diff,
        ip: params.ip ?? null,
      },
    });
  } catch (error) {
    // L'audit ne doit jamais bloquer l'action métier, mais on le signale.
    console.error("Échec d'écriture du journal d'audit :", error);
  }
}
