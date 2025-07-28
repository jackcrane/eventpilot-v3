/*
  Warnings:

  - You are about to drop the column `pricingTierId` on the `Registration` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_pricingTierId_fkey";

-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "pricingTierId",
ADD COLUMN     "registrationPeriodId" TEXT;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_registrationPeriodId_fkey" FOREIGN KEY ("registrationPeriodId") REFERENCES "RegistrationPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
