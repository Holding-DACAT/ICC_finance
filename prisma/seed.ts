import { PrismaClient } from "@prisma/client";

import { seedDatabase } from "../src/lib/seed";

// Exécuté via `pnpm db:seed` (configuré dans package.json → prisma.seed).
const prisma = new PrismaClient();

async function main() {
  const summary = await seedDatabase(prisma);
  console.log("✔ Seed terminé :", summary);
}

main()
  .catch((e) => {
    console.error("✖ Échec du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
