-- CreateEnum
CREATE TYPE "LedgerItemSource" AS ENUM ('REGISTRATION', 'DONATION', 'PAYMENT', 'REFUND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'LEDGER_ITEM_CREATED';
ALTER TYPE "LogType" ADD VALUE 'LEDGER_ITEM_UPDATED';
ALTER TYPE "LogType" ADD VALUE 'LEDGER_ITEM_DELETED';

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "ledgerItemId" TEXT;

-- CreateTable
CREATE TABLE "LedgerItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" "LedgerItemSource" NOT NULL,
    "stripe_paymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LedgerItem" ADD CONSTRAINT "LedgerItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_ledgerItemId_fkey" FOREIGN KEY ("ledgerItemId") REFERENCES "LedgerItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
