-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "crmPersonId" TEXT;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
