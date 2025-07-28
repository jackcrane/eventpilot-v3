-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_pricingTierId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_registrationTierId_fkey";

-- AlterTable
ALTER TABLE "Registration" ALTER COLUMN "registrationTierId" DROP NOT NULL,
ALTER COLUMN "pricingTierId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_registrationTierId_fkey" FOREIGN KEY ("registrationTierId") REFERENCES "RegistrationTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "RegistrationPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
