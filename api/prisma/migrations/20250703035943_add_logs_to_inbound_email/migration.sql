-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "inboundEmailId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_inboundEmailId_fkey" FOREIGN KEY ("inboundEmailId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
