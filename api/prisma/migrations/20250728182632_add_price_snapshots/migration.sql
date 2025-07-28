/*
  Warnings:

  - Added the required column `priceSnapshot` to the `Registration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceSnapshot` to the `RegistrationUpsell` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "priceSnapshot" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationUpsell" ADD COLUMN     "priceSnapshot" DOUBLE PRECISION NOT NULL;
