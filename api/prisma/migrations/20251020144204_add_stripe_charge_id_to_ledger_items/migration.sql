/*
  Warnings:

  - A unique constraint covering the columns `[stripe_chargeId]` on the table `LedgerItem` will be added. If there are existing duplicate values, this will fail.
  - Made the column `instanceId` on table `DayOfDashboardAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `DayOfDashboardProvisioner` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "LedgerItemSource" ADD VALUE 'DAY_OF_DASHBOARD';

-- DropForeignKey
ALTER TABLE "DayOfDashboardAccount" DROP CONSTRAINT "DayOfDashboardAccount_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardProvisioner" DROP CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey";

-- AlterTable
ALTER TABLE "DayOfDashboardAccount" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DayOfDashboardProvisioner" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LedgerItem" ADD COLUMN     "dayOfDashboardAccountId" TEXT,
ADD COLUMN     "stripe_chargeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LedgerItem_stripe_chargeId_key" ON "LedgerItem"("stripe_chargeId");

-- CreateIndex
CREATE INDEX "LedgerItem_dayOfDashboardAccountId_idx" ON "LedgerItem"("dayOfDashboardAccountId");

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerItem" ADD CONSTRAINT "LedgerItem_dayOfDashboardAccountId_fkey" FOREIGN KEY ("dayOfDashboardAccountId") REFERENCES "DayOfDashboardAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
