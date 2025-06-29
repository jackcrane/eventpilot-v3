-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "importId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CrmPersonsImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
