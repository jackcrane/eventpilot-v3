/*
  Warnings:

  - A unique constraint covering the columns `[stripe_subscriptionId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "goodPaymentStanding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_subscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_stripe_subscriptionId_key" ON "Event"("stripe_subscriptionId");
