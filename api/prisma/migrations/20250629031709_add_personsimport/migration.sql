-- AlterTable
ALTER TABLE "CrmPerson" ADD COLUMN     "importId" TEXT;

-- CreateTable
CREATE TABLE "CrmPersonsImport" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPersonsImport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CrmPersonsImport" ADD CONSTRAINT "CrmPersonsImport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPerson" ADD CONSTRAINT "CrmPerson_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CrmPersonsImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
