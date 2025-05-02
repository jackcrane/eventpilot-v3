/*
  Warnings:

  - A unique constraint covering the columns `[logoFileId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "logoFileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_logoFileId_key" ON "Event"("logoFileId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
