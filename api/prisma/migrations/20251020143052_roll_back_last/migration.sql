/*
  Warnings:

  - You are about to drop the `CrmPersonCard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DayOfDashboardPayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CrmPersonCard" DROP CONSTRAINT "CrmPersonCard_crmPersonId_fkey";

-- DropForeignKey
ALTER TABLE "CrmPersonCard" DROP CONSTRAINT "CrmPersonCard_eventId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardAccount" DROP CONSTRAINT "DayOfDashboardAccount_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardPayment" DROP CONSTRAINT "DayOfDashboardPayment_accountId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardPayment" DROP CONSTRAINT "DayOfDashboardPayment_crmPersonId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardPayment" DROP CONSTRAINT "DayOfDashboardPayment_eventId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardPayment" DROP CONSTRAINT "DayOfDashboardPayment_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardPayment" DROP CONSTRAINT "DayOfDashboardPayment_ledgerItemId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardPayment" DROP CONSTRAINT "DayOfDashboardPayment_provisionerId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardProvisioner" DROP CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey";

-- AlterTable
ALTER TABLE "DayOfDashboardAccount" ALTER COLUMN "instanceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DayOfDashboardProvisioner" ALTER COLUMN "instanceId" DROP NOT NULL;

-- DropTable
DROP TABLE "CrmPersonCard";

-- DropTable
DROP TABLE "DayOfDashboardPayment";

-- DropEnum
DROP TYPE "DayOfDashboardPaymentStatus";

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
