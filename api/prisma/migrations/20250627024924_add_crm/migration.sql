-- CreateEnum
CREATE TYPE "CrmFieldType" AS ENUM ('TEXT', 'EMAIL', 'PHONE', 'BOOLEAN', 'DATE');

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "crmPersonEmailId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "reddit" TEXT,
ADD COLUMN     "snapchat" TEXT,
ADD COLUMN     "threads" TEXT,
ADD COLUMN     "tiktok" TEXT;

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "crmPersonId" TEXT;

-- CreateTable
CREATE TABLE "CrmPerson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPersonEmail" (
    "id" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrmPersonEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPersonPhone" (
    "id" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrmPersonPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmField" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CrmFieldType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrmField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPersonField" (
    "id" TEXT NOT NULL,
    "crmFieldId" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPersonField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_crmPersonEmailId_fkey" FOREIGN KEY ("crmPersonEmailId") REFERENCES "CrmPersonEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonEmail" ADD CONSTRAINT "CrmPersonEmail_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonPhone" ADD CONSTRAINT "CrmPersonPhone_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonField" ADD CONSTRAINT "CrmPersonField_crmFieldId_fkey" FOREIGN KEY ("crmFieldId") REFERENCES "CrmField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonField" ADD CONSTRAINT "CrmPersonField_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
