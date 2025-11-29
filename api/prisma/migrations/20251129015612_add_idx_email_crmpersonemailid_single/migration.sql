-- CreateIndex
CREATE INDEX "idx_email_crmpersonid" ON "Email"("crmPersonId");

-- CreateIndex
CREATE INDEX "idx_email_crmpersonemailid_single" ON "Email"("crmPersonEmailId");
