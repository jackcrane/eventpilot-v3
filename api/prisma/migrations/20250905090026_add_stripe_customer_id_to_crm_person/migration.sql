/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customerId]` on the table `CrmPerson` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CrmPerson" ADD COLUMN     "stripe_customerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CrmPerson_stripe_customerId_key" ON "CrmPerson"("stripe_customerId");
