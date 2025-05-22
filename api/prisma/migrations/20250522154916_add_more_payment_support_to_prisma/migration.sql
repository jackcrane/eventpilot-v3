-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'STRIPE_SETUP_INTENT_SUCCEEDED';
ALTER TYPE "LogType" ADD VALUE 'STRIPE_PAYMENT_METHOD_ATTACHED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goodPaymentStanding" BOOLEAN NOT NULL DEFAULT false;
