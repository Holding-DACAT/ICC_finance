-- CreateTable Company : entité juridique (raison sociale) éditable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalForm" TEXT,
    "siren" TEXT,
    "oriasNumber" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "rcProInsurer" TEXT,
    "rcProPolicy" TEXT,
    "rcProExpiry" TIMESTAMP(3),
    "guaranteeAmount" INTEGER,
    "guaranteeExpiry" TIMESTAMP(3),
    "sharePointUrl" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateTable CompanyDirector : directeur(s)/gérant(s) d'une société (N-N)
CREATE TABLE "CompanyDirector" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "CompanyDirector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDirector_companyId_memberId_key" ON "CompanyDirector"("companyId", "memberId");

-- AlterTable Agency : rattachement à une société
ALTER TABLE "Agency" ADD COLUMN "companyId" TEXT;

-- CreateIndex
CREATE INDEX "Agency_companyId_idx" ON "Agency"("companyId");

-- AlterTable Member : e-mail personnel + rattachement société
ALTER TABLE "Member" ADD COLUMN "personalEmail" TEXT,
ADD COLUMN "companyId" TEXT;

-- CreateIndex
CREATE INDEX "Member_companyId_idx" ON "Member"("companyId");

-- AlterTable OriasRegistration : associations professionnelles distinctes (MIOBSP / MIA)
ALTER TABLE "OriasRegistration" ADD COLUMN "assocMiobspLogin" TEXT,
ADD COLUMN "assocMiobspPassword" TEXT,
ADD COLUMN "assocMiaLogin" TEXT,
ADD COLUMN "assocMiaPassword" TEXT;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDirector" ADD CONSTRAINT "CompanyDirector_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDirector" ADD CONSTRAINT "CompanyDirector_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
