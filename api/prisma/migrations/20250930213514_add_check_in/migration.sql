-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'VOLUNTEER_SHIFT_CHECKED_IN';
ALTER TYPE "LogType" ADD VALUE 'VOLUNTEER_SHIFT_CHECKED_OUT';

-- AlterTable
ALTER TABLE "FormResponseShift" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInById" TEXT;

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "dayOfDashboardAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "FormResponseShift" ADD CONSTRAINT "FormResponseShift_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "DayOfDashboardAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_dayOfDashboardAccountId_fkey" FOREIGN KEY ("dayOfDashboardAccountId") REFERENCES "DayOfDashboardAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
