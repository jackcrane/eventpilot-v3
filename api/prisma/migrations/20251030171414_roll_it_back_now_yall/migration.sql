/*
  Warnings:

  - The values [DAY_OF_DASHBOARD] on the enum `LedgerItemSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dayOfDashboardAccountId` on the `LedgerItem` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_chargeId` on the `LedgerItem` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LedgerItemSource_new" AS ENUM ('REGISTRATION', 'DONATION', 'PAYMENT', 'REFUND');
ALTER TABLE "LedgerItem" ALTER COLUMN "source" TYPE "LedgerItemSource_new" USING ("source"::text::"LedgerItemSource_new");
ALTER TYPE "LedgerItemSource" RENAME TO "LedgerItemSource_old";
ALTER TYPE "LedgerItemSource_new" RENAME TO "LedgerItemSource";
DROP TYPE "LedgerItemSource_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "DayOfDashboardAccount" DROP CONSTRAINT "DayOfDashboardAccount_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardProvisioner" DROP CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerItem" DROP CONSTRAINT "LedgerItem_dayOfDashboardAccountId_fkey";

-- DropIndex
DROP INDEX "LedgerItem_dayOfDashboardAccountId_idx";

-- DropIndex
DROP INDEX "LedgerItem_stripe_chargeId_key";

-- AlterTable
ALTER TABLE "DayOfDashboardAccount" ALTER COLUMN "instanceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DayOfDashboardProvisioner" ALTER COLUMN "instanceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LedgerItem" DROP COLUMN "dayOfDashboardAccountId",
DROP COLUMN "stripe_chargeId";

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
