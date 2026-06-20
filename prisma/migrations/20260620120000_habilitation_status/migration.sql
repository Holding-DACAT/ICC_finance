-- CreateEnum : statut annuel d'habilitation des équipes
CREATE TYPE "HabilitationStatus" AS ENUM ('VALIDEE', 'A_VALIDER');

-- AlterTable OriasRegistration : habilitation annuelle (remise à zéro au 1er janvier)
ALTER TABLE "OriasRegistration"
  ADD COLUMN     "habilitationStatus" "HabilitationStatus" NOT NULL DEFAULT 'A_VALIDER',
  ADD COLUMN     "habilitationYear" INTEGER,
  ADD COLUMN     "habilitationValidatedAt" TIMESTAMP(3);
