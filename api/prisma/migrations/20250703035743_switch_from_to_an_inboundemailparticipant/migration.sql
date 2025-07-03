/*
  Warnings:

  - You are about to drop the column `fromEmail` on the `InboundEmail` table. All the data in the column will be lost.
  - You are about to drop the column `fromMailboxHash` on the `InboundEmail` table. All the data in the column will be lost.
  - You are about to drop the column `fromName` on the `InboundEmail` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fromEmailId]` on the table `InboundEmailParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "InboundEmail" DROP COLUMN "fromEmail",
DROP COLUMN "fromMailboxHash",
DROP COLUMN "fromName";

-- AlterTable
ALTER TABLE "InboundEmailParticipant" ADD COLUMN     "fromEmailId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmailParticipant_fromEmailId_key" ON "InboundEmailParticipant"("fromEmailId");

-- AddForeignKey
ALTER TABLE "InboundEmailParticipant" ADD CONSTRAINT "InboundEmailParticipant_fromEmailId_fkey" FOREIGN KEY ("fromEmailId") REFERENCES "InboundEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
