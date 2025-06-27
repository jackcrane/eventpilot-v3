-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'CRM_FIELD_CREATED';
ALTER TYPE "LogType" ADD VALUE 'CRM_FIELD_MODIFIED';
ALTER TYPE "LogType" ADD VALUE 'CRM_FIELD_DELETED';

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "crmFieldId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_crmFieldId_fkey" FOREIGN KEY ("crmFieldId") REFERENCES "CrmField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
