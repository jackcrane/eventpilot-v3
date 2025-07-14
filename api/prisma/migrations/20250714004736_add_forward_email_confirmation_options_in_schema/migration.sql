/*
  Warnings:

  - A unique constraint covering the columns `[forwardEmailConfirmationEmailId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "forwardEmailConfirmationEmailId" TEXT,
ADD COLUMN     "forwardEmailConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Event_forwardEmailConfirmationEmailId_key" ON "Event"("forwardEmailConfirmationEmailId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_forwardEmailConfirmationEmailId_fkey" FOREIGN KEY ("forwardEmailConfirmationEmailId") REFERENCES "InboundEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
