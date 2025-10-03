-- CreateIndex
CREATE INDEX "CrmPerson_eventId_deleted_createdAt_idx" ON "CrmPerson"("eventId", "deleted", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmPersonEmail_crmPersonId_idx" ON "CrmPersonEmail"("crmPersonId");

-- CreateIndex
CREATE INDEX "CrmPersonLink_crmPersonId_idx" ON "CrmPersonLink"("crmPersonId");

-- CreateIndex
CREATE INDEX "Email_crmPersonId_createdAt_idx" ON "Email"("crmPersonId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Email_crmPersonEmailId_createdAt_idx" ON "Email"("crmPersonEmailId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Email_campaignId_idx" ON "Email"("campaignId");

-- CreateIndex
CREATE INDEX "FormResponse_eventId_deleted_instanceId_createdAt_idx" ON "FormResponse"("eventId", "deleted", "instanceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Registration_eventId_deleted_crmPersonId_createdAt_idx" ON "Registration"("eventId", "deleted", "crmPersonId", "createdAt" DESC);
