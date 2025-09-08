/*
  Warnings:

  - Added the required column `eventId` to the `TodoItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TodoItem" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
