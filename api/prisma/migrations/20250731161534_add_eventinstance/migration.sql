-- AlterTable
ALTER TABLE "FormField" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "FormResponse" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "LedgerItem" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationField" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationFieldResponse" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationPage" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationPeriodPricing" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationPricing" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationTier" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "instanceId" TEXT;

-- AlterTable
ALTER TABLE "UpsellItem" ADD COLUMN     "instanceId" TEXT;

-- CreateTable
CREATE TABLE "EventInstance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "startTimeTz" TEXT NOT NULL,
    "endTimeTz" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInstance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventInstance" ADD CONSTRAINT "EventInstance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerItem" ADD CONSTRAINT "LedgerItem_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationTier" ADD CONSTRAINT "RegistrationTier_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPeriodPricing" ADD CONSTRAINT "RegistrationPeriodPricing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPeriodPricing" ADD CONSTRAINT "RegistrationPeriodPricing_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPricing" ADD CONSTRAINT "RegistrationPricing_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellItem" ADD CONSTRAINT "UpsellItem_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPage" ADD CONSTRAINT "RegistrationPage_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationField" ADD CONSTRAINT "RegistrationField_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationFieldResponse" ADD CONSTRAINT "RegistrationFieldResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationFieldResponse" ADD CONSTRAINT "RegistrationFieldResponse_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
