import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma en singleton (évite l'épuisement des connexions en dev/serverless).
 * À n'utiliser QUE côté serveur (Server Actions, Route Handlers, scripts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
