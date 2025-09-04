/*
  Warnings:

  - You are about to drop the column `stripe_customerId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripe_customerId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "stripe_customerId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripe_customerId";

-- CreateIndex
CREATE UNIQUE INDEX "Event_stripe_customerId_key" ON "Event"("stripe_customerId");
