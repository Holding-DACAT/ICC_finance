-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "NetworkType" AS ENUM ('FRANCHISE', 'FILIALE', 'AFFILIE');

-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('FRANCHISE', 'FILIALE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD', 'MANDAT', 'FRANCHISE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIF', 'INACTIF');

-- CreateEnum
CREATE TYPE "LicenseTier" AS ENUM ('SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "OriasCategory" AS ENUM ('COBSP', 'MOBSP', 'MIOBSP', 'COA', 'MIAS', 'MIA', 'CIF', 'IFP');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('A_JOUR', 'A_RENOUVELER', 'EXPIRE');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('AUCUN', 'EN_COURS', 'TERMINE');

-- CreateEnum
CREATE TYPE "OnboardingStepStatus" AS ENUM ('A_FAIRE', 'EN_COURS', 'FAIT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RH', 'IT', 'DIRECTEUR_AGENCE', 'LECTURE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgencyType" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIF',
    "legalName" TEXT,
    "legalForm" TEXT,
    "address" TEXT,
    "oriasNumber" TEXT,
    "rcProInsurer" TEXT,
    "rcProExpiry" TIMESTAMP(3),
    "guaranteeAmount" INTEGER,
    "guaranteeExpiry" TIMESTAMP(3),
    "sharePointUrl" TEXT,
    "redevanceExcluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyDirector" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "AgencyDirector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "civility" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "contractType" "ContractType" NOT NULL,
    "functionTitle" TEXT NOT NULL,
    "functionSub" TEXT,
    "network" "NetworkType" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIF',
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3),
    "sharePointUrl" TEXT,
    "adObjectId" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Computer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "lastSyncDate" TIMESTAMP(3),
    "diskFreePct" INTEGER NOT NULL DEFAULT 0,
    "licenseTier" "LicenseTier",
    "source" TEXT,
    "assignedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Computer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OriasRegistration" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "oriasNumber" TEXT,
    "categories" "OriasCategory"[],
    "registrationDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "status" "ComplianceStatus" NOT NULL DEFAULT 'A_JOUR',
    "rcProInsurer" TEXT,
    "rcProPolicy" TEXT,
    "rcProExpiry" TIMESTAMP(3),
    "guaranteeAmount" INTEGER,
    "guaranteeExpiry" TIMESTAMP(3),
    "capacityProOk" BOOLEAN NOT NULL DEFAULT false,
    "honorabilityOk" BOOLEAN NOT NULL DEFAULT false,
    "honorabilityDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OriasRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "requiredHours" INTEGER NOT NULL DEFAULT 15,
    "completedHours" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "provider" TEXT,
    "certificateUrl" TEXT,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProcess" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'AUCUN',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "assignedToId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "OnboardingStepStatus" NOT NULL DEFAULT 'A_FAIRE',
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'LECTURE',
    "scopedAgencyId" TEXT,
    "adObjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyDirector_agencyId_memberId_key" ON "AgencyDirector"("agencyId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_agencyId_idx" ON "Member"("agencyId");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Computer_name_key" ON "Computer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Computer_serialNumber_key" ON "Computer"("serialNumber");

-- CreateIndex
CREATE INDEX "Computer_assignedMemberId_idx" ON "Computer"("assignedMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "OriasRegistration_memberId_key" ON "OriasRegistration"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Training_memberId_year_key" ON "Training"("memberId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProcess_memberId_key" ON "OnboardingProcess"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "AgencyDirector" ADD CONSTRAINT "AgencyDirector_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyDirector" ADD CONSTRAINT "AgencyDirector_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Computer" ADD CONSTRAINT "Computer_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OriasRegistration" ADD CONSTRAINT "OriasRegistration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProcess" ADD CONSTRAINT "OnboardingProcess_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProcess" ADD CONSTRAINT "OnboardingProcess_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OnboardingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

