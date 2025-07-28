-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'UPSELL_SOLD';
ALTER TYPE "LogType" ADD VALUE 'REGISTRATION_PERIOD_PRICING_SOLD';

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "registrationPeriodPricingId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_registrationPeriodPricingId_fkey" FOREIGN KEY ("registrationPeriodPricingId") REFERENCES "RegistrationPeriodPricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
