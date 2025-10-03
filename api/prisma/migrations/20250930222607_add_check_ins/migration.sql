-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInById" TEXT;

-- CreateIndex
CREATE INDEX "Registration_checkedInById_idx" ON "Registration"("checkedInById");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "DayOfDashboardAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
