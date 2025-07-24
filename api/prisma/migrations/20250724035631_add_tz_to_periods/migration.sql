/*
  Warnings:

  - You are about to drop the column `end` on the `RegistrationPricing` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `RegistrationPricing` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `RegistrationPricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTimeTz` to the `RegistrationPricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `RegistrationPricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTimeTz` to the `RegistrationPricing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RegistrationPricing" DROP COLUMN "end",
DROP COLUMN "start",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "endTimeTz" TEXT NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTimeTz" TEXT NOT NULL;
