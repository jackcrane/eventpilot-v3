/*
  Warnings:

  - Added the required column `eventId` to the `CrmField` table without a default value. This is not possible if the table is not empty.
  - Added the required column `generalTableOrder` to the `CrmField` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personTableOrder` to the `CrmField` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `CrmPerson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CrmField" ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "generalTableOrder" INTEGER NOT NULL,
ADD COLUMN     "personTableOrder" INTEGER NOT NULL,
ADD COLUMN     "showInGeneralTable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showInPersonTable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CrmPerson" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "CrmPerson" ADD CONSTRAINT "CrmPerson_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmField" ADD CONSTRAINT "CrmField_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
