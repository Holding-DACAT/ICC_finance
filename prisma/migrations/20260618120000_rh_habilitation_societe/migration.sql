-- AlterTable Agency : coordonnées + SIREN
ALTER TABLE "Agency" ADD COLUMN     "siren" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "email" TEXT;

-- AlterTable Member : informations RH complémentaires
ALTER TABLE "Member" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "postalAddress" TEXT,
ADD COLUMN     "siren" TEXT,
ADD COLUMN     "legalMentions" TEXT;

-- AlterTable OriasRegistration : habilitation (ORIAS + associations professionnelles)
ALTER TABLE "OriasRegistration" ADD COLUMN     "oriasLogin" TEXT,
ADD COLUMN     "oriasPassword" TEXT,
ADD COLUMN     "assocLogin" TEXT,
ADD COLUMN     "assocPassword" TEXT;
