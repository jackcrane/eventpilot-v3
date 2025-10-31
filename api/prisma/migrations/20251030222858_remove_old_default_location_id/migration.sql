/*
  Warnings:

  - You are about to drop the column `stripeTerminalDefaultLocationId` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "stripeTerminalDefaultLocationId";
