/*
  Warnings:

  - Made the column `instanceId` on table `DayOfDashboardAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `DayOfDashboardProvisioner` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DayOfDashboardPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'AWAITING_CUSTOMER', 'FAILED');

-- DropForeignKey
ALTER TABLE "DayOfDashboardAccount" DROP CONSTRAINT "DayOfDashboardAccount_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "DayOfDashboardProvisioner" DROP CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey";

-- AlterTable
ALTER TABLE "DayOfDashboardAccount" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DayOfDashboardProvisioner" ALTER COLUMN "instanceId" SET NOT NULL;

-- CreateTable
CREATE TABLE "DayOfDashboardPayment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "provisionerId" TEXT,
    "accountId" TEXT,
    "stripePaymentIntentId" TEXT NOT NULL,
    "status" "DayOfDashboardPaymentStatus" NOT NULL,
    "amount" DOUBLE PRECISION,
    "netAmount" DOUBLE PRECISION,
    "currency" TEXT,
    "cardholderName" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardFingerprint" TEXT,
    "receiptEmail" TEXT,
    "crmPersonId" TEXT,
    "ledgerItemId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayOfDashboardPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPersonCard" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "fingerprint" TEXT,
    "brand" TEXT,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "cardholderName" TEXT,
    "stripePaymentMethodId" TEXT,
    "generatedCardId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPersonCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayOfDashboardPayment_stripePaymentIntentId_key" ON "DayOfDashboardPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "DayOfDashboardPayment_eventId_idx" ON "DayOfDashboardPayment"("eventId");

-- CreateIndex
CREATE INDEX "DayOfDashboardPayment_instanceId_idx" ON "DayOfDashboardPayment"("instanceId");

-- CreateIndex
CREATE INDEX "DayOfDashboardPayment_crmPersonId_idx" ON "DayOfDashboardPayment"("crmPersonId");

-- CreateIndex
CREATE INDEX "CrmPersonCard_eventId_idx" ON "CrmPersonCard"("eventId");

-- CreateIndex
CREATE INDEX "CrmPersonCard_crmPersonId_idx" ON "CrmPersonCard"("crmPersonId");

-- CreateIndex
CREATE INDEX "CrmPersonCard_fingerprint_idx" ON "CrmPersonCard"("fingerprint");

-- CreateIndex
CREATE INDEX "CrmPersonCard_eventId_brand_last4_idx" ON "CrmPersonCard"("eventId", "brand", "last4");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPersonCard_eventId_fingerprint_key" ON "CrmPersonCard"("eventId", "fingerprint");

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardPayment" ADD CONSTRAINT "DayOfDashboardPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardPayment" ADD CONSTRAINT "DayOfDashboardPayment_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardPayment" ADD CONSTRAINT "DayOfDashboardPayment_provisionerId_fkey" FOREIGN KEY ("provisionerId") REFERENCES "DayOfDashboardProvisioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardPayment" ADD CONSTRAINT "DayOfDashboardPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "DayOfDashboardAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardPayment" ADD CONSTRAINT "DayOfDashboardPayment_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardPayment" ADD CONSTRAINT "DayOfDashboardPayment_ledgerItemId_fkey" FOREIGN KEY ("ledgerItemId") REFERENCES "LedgerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonCard" ADD CONSTRAINT "CrmPersonCard_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonCard" ADD CONSTRAINT "CrmPersonCard_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
