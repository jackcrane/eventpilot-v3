/*
  Warnings:

  - Added the required column `pageId` to the `RegistrationField` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RegistrationField" ADD COLUMN     "pageId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "RegistrationPage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationPage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegistrationPage" ADD CONSTRAINT "RegistrationPage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationField" ADD CONSTRAINT "RegistrationField_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "RegistrationPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
