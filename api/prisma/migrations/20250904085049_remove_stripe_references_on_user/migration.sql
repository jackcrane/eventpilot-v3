/*
  Warnings:

  - You are about to drop the column `goodPaymentStanding` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_setupIntentId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "goodPaymentStanding",
DROP COLUMN "stripe_setupIntentId";
