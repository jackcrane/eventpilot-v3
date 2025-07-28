-- AlterTable
ALTER TABLE "RegistrationPeriodPricing" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RegistrationPricing" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RegistrationTier" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;
