-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "registrationPeriodPricingId" TEXT;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_registrationPeriodPricingId_fkey" FOREIGN KEY ("registrationPeriodPricingId") REFERENCES "RegistrationPeriodPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
