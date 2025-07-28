-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'STRIPE_WEBHOOK_RECEIVED';
ALTER TYPE "LogType" ADD VALUE 'STRIPE_PAYMENT_INTENT_SUCCEEDED';
ALTER TYPE "LogType" ADD VALUE 'REGISTRATION_CONFIRMED';
