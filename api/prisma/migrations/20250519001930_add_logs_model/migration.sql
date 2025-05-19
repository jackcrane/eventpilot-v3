/*
  Warnings:

  - Added the required column `updatedAt` to the `Geolocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Geolocation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "emailPreferencesId" TEXT,
ADD COLUMN     "emailVerificationId" TEXT,
ADD COLUMN     "emailWebookId" TEXT,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "forgotPasswordTokenId" TEXT,
ADD COLUMN     "formFieldId" TEXT,
ADD COLUMN     "formResponseId" TEXT,
ADD COLUMN     "geolocationId" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "shiftId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_emailPreferencesId_fkey" FOREIGN KEY ("emailPreferencesId") REFERENCES "EmailPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_emailVerificationId_fkey" FOREIGN KEY ("emailVerificationId") REFERENCES "EmailVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_emailWebookId_fkey" FOREIGN KEY ("emailWebookId") REFERENCES "EmailWebhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_forgotPasswordTokenId_fkey" FOREIGN KEY ("forgotPasswordTokenId") REFERENCES "ForgotPasswordToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_geolocationId_fkey" FOREIGN KEY ("geolocationId") REFERENCES "Geolocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_formFieldId_fkey" FOREIGN KEY ("formFieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
