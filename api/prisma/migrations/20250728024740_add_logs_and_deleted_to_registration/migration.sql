-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'REGISTRATION_CREATED';
ALTER TYPE "LogType" ADD VALUE 'REGISTRATION_UPDATED';
ALTER TYPE "LogType" ADD VALUE 'REGISTRATION_DELETED';

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "registrationId" TEXT;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
