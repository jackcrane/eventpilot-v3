-- AlterTable
ALTER TABLE "InboundEmail" ADD COLUMN     "crmPersonId" TEXT,
ADD COLUMN     "eventId" TEXT;

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
