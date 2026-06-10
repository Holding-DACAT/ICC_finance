// Build Vercel robuste pour GESTION RH (Next.js + Prisma + Neon).
// - génère le client Prisma (toujours requis) ;
// - applique les migrations si DATABASE_URL et DIRECT_URL sont présents ;
//   * si elles échouent malgré une BDD configurée → le build échoue (problème réel à corriger) ;
//   * si les variables sont absentes → on n'échoue pas : le site se déploie en mode « BDD non
//     connectée » (les écrans affichent un message clair) afin de ne pas bloquer la livraison.
// - construit l'application Next.js.
import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

run("pnpm exec prisma generate");

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
if (hasDb) {
  console.log("✔ DATABASE_URL + DIRECT_URL détectées : application des migrations.");
  run("pnpm exec prisma migrate deploy"); // en cas d'échec → exception → build rouge (volontaire)
} else {
  console.warn(
    "⚠ DATABASE_URL et/ou DIRECT_URL absentes de cet environnement de déploiement : " +
      "migrations ignorées. Définissez-les dans Vercel (Preview ET Production) pour activer la BDD.",
  );
}

run("pnpm exec next build");
