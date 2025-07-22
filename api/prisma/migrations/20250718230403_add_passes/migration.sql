-- CreateEnum
CREATE TYPE "PassType" AS ENUM ('PARTICIPANT', 'VOLUNTEER', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'PASS_CREATED';
ALTER TYPE "LogType" ADD VALUE 'PASS_INSTALLED';
ALTER TYPE "LogType" ADD VALUE 'PASS_CHANGED';
ALTER TYPE "LogType" ADD VALUE 'PASS_UNINSTALLED';

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "passId" TEXT;

-- CreateTable
CREATE TABLE "Pass" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "PassType" NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_passId_fkey" FOREIGN KEY ("passId") REFERENCES "Pass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
