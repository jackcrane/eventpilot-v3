-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "crmPersonId" TEXT;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
