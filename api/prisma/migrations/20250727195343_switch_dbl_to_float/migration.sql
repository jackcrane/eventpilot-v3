/*
  Warnings:

  - You are about to alter the column `price` on the `RegistrationPeriodPricing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `UpsellItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "RegistrationPeriodPricing" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "UpsellItem" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;
