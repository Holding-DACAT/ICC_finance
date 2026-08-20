-- Suivi back-office des apporteurs d'affaires : référentiel apporteur,
-- convention d'apport (règle de rétrocession) et versements de ristourne.
-- Ajoute également le rôle applicatif BACK_OFFICE.

-- CreateEnum
CREATE TYPE "ApporteurStatus" AS ENUM ('ACTIF', 'INACTIF');

-- CreateEnum
CREATE TYPE "ConventionStatus" AS ENUM ('SIGNEE', 'A_FAIRE', 'NON_SIGNEE', 'RESILIEE');

-- CreateEnum
CREATE TYPE "RemunerationType" AS ENUM ('POURCENTAGE', 'FORFAIT', 'AUCUNE', 'NON_RENSEIGNEE');

-- CreateEnum
CREATE TYPE "RemunerationBase" AS ENUM ('COMMISSION', 'HONORAIRES');

-- CreateEnum
CREATE TYPE "VersementType" AS ENUM ('RISTOURNE', 'DON', 'PARRAINAGE');

-- CreateEnum
CREATE TYPE "VersementStatus" AS ENUM ('A_VERSER', 'VERSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('VIREMENT', 'CHEQUE', 'DEDUIT', 'AUTRE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BACK_OFFICE';

-- CreateTable
CREATE TABLE "Apporteur" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siren" TEXT,
    "enseigne" TEXT,
    "holderName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "kbisDate" TIMESTAMP(3),
    "ribReceived" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApporteurStatus" NOT NULL DEFAULT 'ACTIF',
    "notes" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apporteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApporteurConvention" (
    "id" TEXT NOT NULL,
    "apporteurId" TEXT NOT NULL,
    "number" TEXT,
    "requestedBy" TEXT,
    "signatureStatus" "ConventionStatus" NOT NULL DEFAULT 'A_FAIRE',
    "conventionDate" TIMESTAMP(3),
    "kbisDate" TIMESTAMP(3),
    "holderName" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "remunerationType" "RemunerationType" NOT NULL DEFAULT 'POURCENTAGE',
    "remunerationRate" DOUBLE PRECISION,
    "remunerationFixedCents" INTEGER,
    "remunerationCapCents" INTEGER,
    "remunerationBase" "RemunerationBase" NOT NULL DEFAULT 'COMMISSION',
    "remunerationLabel" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApporteurConvention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApporteurVersement" (
    "id" TEXT NOT NULL,
    "apporteurId" TEXT NOT NULL,
    "conventionId" TEXT,
    "companyId" TEXT,
    "companyLabel" TEXT,
    "agencyId" TEXT,
    "commercialName" TEXT NOT NULL,
    "memberId" TEXT,
    "type" "VersementType" NOT NULL DEFAULT 'RISTOURNE',
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "dossierLabel" TEXT NOT NULL,
    "acteloCaseId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "commissionCents" INTEGER,
    "feesCents" INTEGER,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'VIREMENT',
    "paymentRef" TEXT,
    "invoiceReceived" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TIMESTAMP(3),
    "sirenKbis" TEXT,
    "sirenInvoice" TEXT,
    "sirenVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "VersementStatus" NOT NULL DEFAULT 'A_VERSER',
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApporteurVersement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apporteur_name_key" ON "Apporteur"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Apporteur_siren_key" ON "Apporteur"("siren");

-- CreateIndex
CREATE INDEX "Apporteur_companyId_idx" ON "Apporteur"("companyId");

-- CreateIndex
CREATE INDEX "Apporteur_status_idx" ON "Apporteur"("status");

-- CreateIndex
CREATE INDEX "ApporteurConvention_apporteurId_idx" ON "ApporteurConvention"("apporteurId");

-- CreateIndex
CREATE INDEX "ApporteurConvention_signatureStatus_idx" ON "ApporteurConvention"("signatureStatus");

-- CreateIndex
CREATE INDEX "ApporteurConvention_companyId_idx" ON "ApporteurConvention"("companyId");

-- CreateIndex
CREATE INDEX "ApporteurVersement_apporteurId_idx" ON "ApporteurVersement"("apporteurId");

-- CreateIndex
CREATE INDEX "ApporteurVersement_conventionId_idx" ON "ApporteurVersement"("conventionId");

-- CreateIndex
CREATE INDEX "ApporteurVersement_companyId_idx" ON "ApporteurVersement"("companyId");

-- CreateIndex
CREATE INDEX "ApporteurVersement_agencyId_idx" ON "ApporteurVersement"("agencyId");

-- CreateIndex
CREATE INDEX "ApporteurVersement_memberId_idx" ON "ApporteurVersement"("memberId");

-- CreateIndex
CREATE INDEX "ApporteurVersement_year_idx" ON "ApporteurVersement"("year");

-- CreateIndex
CREATE INDEX "ApporteurVersement_status_idx" ON "ApporteurVersement"("status");

-- AddForeignKey
ALTER TABLE "Apporteur" ADD CONSTRAINT "Apporteur_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurConvention" ADD CONSTRAINT "ApporteurConvention_apporteurId_fkey" FOREIGN KEY ("apporteurId") REFERENCES "Apporteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurConvention" ADD CONSTRAINT "ApporteurConvention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurVersement" ADD CONSTRAINT "ApporteurVersement_apporteurId_fkey" FOREIGN KEY ("apporteurId") REFERENCES "Apporteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurVersement" ADD CONSTRAINT "ApporteurVersement_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "ApporteurConvention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurVersement" ADD CONSTRAINT "ApporteurVersement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurVersement" ADD CONSTRAINT "ApporteurVersement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApporteurVersement" ADD CONSTRAINT "ApporteurVersement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

