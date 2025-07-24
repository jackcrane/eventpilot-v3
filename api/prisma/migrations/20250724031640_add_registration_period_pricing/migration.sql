/*
  Warnings:

  - You are about to drop the column `price` on the `RegistrationPricing` table. All the data in the column will be lost.
  - You are about to drop the column `registrationTierId` on the `RegistrationPricing` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `RegistrationPricing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RegistrationPricing" DROP CONSTRAINT "RegistrationPricing_registrationTierId_fkey";

-- AlterTable
ALTER TABLE "RegistrationPricing" DROP COLUMN "price",
DROP COLUMN "registrationTierId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "RegistrationPeriodPricing" (
    "id" TEXT NOT NULL,
    "registrationPeriodId" TEXT NOT NULL,
    "registrationTierId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationPeriodPricing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegistrationPeriodPricing" ADD CONSTRAINT "RegistrationPeriodPricing_registrationPeriodId_fkey" FOREIGN KEY ("registrationPeriodId") REFERENCES "RegistrationPricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPeriodPricing" ADD CONSTRAINT "RegistrationPeriodPricing_registrationTierId_fkey" FOREIGN KEY ("registrationTierId") REFERENCES "RegistrationTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
