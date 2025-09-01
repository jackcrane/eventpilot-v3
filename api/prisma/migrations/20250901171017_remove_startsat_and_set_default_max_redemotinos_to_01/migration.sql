/*
  Warnings:

  - Made the column `maxRedemptions` on table `Coupon` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "maxRedemptions" SET NOT NULL,
ALTER COLUMN "maxRedemptions" SET DEFAULT -1;
