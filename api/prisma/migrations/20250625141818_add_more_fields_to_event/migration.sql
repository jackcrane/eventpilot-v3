/*
  Warnings:

  - A unique constraint covering the columns `[bannerFileId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bannerFileId" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "primaryAddress" TEXT,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "youtube" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_bannerFileId_key" ON "Event"("bannerFileId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_bannerFileId_fkey" FOREIGN KEY ("bannerFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
