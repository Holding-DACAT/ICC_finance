-- AlterEnum
-- Remplace les valeurs de ContractType (CDI/CDD/MANDAT/FRANCHISE) par
-- les types métier MANDATAIRE/SALARIE/GERANT et migre les données existantes.
BEGIN;
CREATE TYPE "ContractType_new" AS ENUM ('MANDATAIRE', 'SALARIE', 'GERANT');
ALTER TABLE "Member" ALTER COLUMN "contractType" TYPE "ContractType_new" USING (
  CASE "contractType"::text
    WHEN 'MANDAT' THEN 'MANDATAIRE'
    WHEN 'FRANCHISE' THEN 'GERANT'
    ELSE 'SALARIE'
  END::"ContractType_new"
);
ALTER TYPE "ContractType" RENAME TO "ContractType_old";
ALTER TYPE "ContractType_new" RENAME TO "ContractType";
DROP TYPE "ContractType_old";
COMMIT;
