-- AlterTable
ALTER TABLE "MailingList" ADD COLUMN     "crmSavedSegmentId" TEXT;

-- AddForeignKey
ALTER TABLE "MailingList" ADD CONSTRAINT "MailingList_crmSavedSegmentId_fkey" FOREIGN KEY ("crmSavedSegmentId") REFERENCES "CrmSavedSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
