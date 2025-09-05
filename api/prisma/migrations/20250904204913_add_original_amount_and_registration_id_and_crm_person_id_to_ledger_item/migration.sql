-- AlterTable
ALTER TABLE "LedgerItem" ADD COLUMN     "crmPersonId" TEXT,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "registrationId" TEXT;

-- CreateIndex
CREATE INDEX "LedgerItem_eventId_instanceId_idx" ON "LedgerItem"("eventId", "instanceId");

-- CreateIndex
CREATE INDEX "LedgerItem_crmPersonId_idx" ON "LedgerItem"("crmPersonId");

-- CreateIndex
CREATE INDEX "LedgerItem_registrationId_idx" ON "LedgerItem"("registrationId");

-- AddForeignKey
ALTER TABLE "LedgerItem" ADD CONSTRAINT "LedgerItem_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerItem" ADD CONSTRAINT "LedgerItem_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
