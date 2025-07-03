/*
  Warnings:

  - You are about to drop the column `crmPersonId` on the `InboundEmail` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InboundEmail" DROP CONSTRAINT "InboundEmail_crmPersonId_fkey";

-- AlterTable
ALTER TABLE "InboundEmail" DROP COLUMN "crmPersonId";

-- CreateTable
CREATE TABLE "_CrmPersonToInboundEmail" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CrmPersonToInboundEmail_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CrmPersonToInboundEmail_B_index" ON "_CrmPersonToInboundEmail"("B");

-- AddForeignKey
ALTER TABLE "_CrmPersonToInboundEmail" ADD CONSTRAINT "_CrmPersonToInboundEmail_A_fkey" FOREIGN KEY ("A") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmPersonToInboundEmail" ADD CONSTRAINT "_CrmPersonToInboundEmail_B_fkey" FOREIGN KEY ("B") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
