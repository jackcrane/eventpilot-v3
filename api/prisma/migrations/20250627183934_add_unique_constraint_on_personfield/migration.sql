/*
  Warnings:

  - A unique constraint covering the columns `[crmPersonId,crmFieldId]` on the table `CrmPersonField` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CrmPersonField_crmPersonId_crmFieldId_key" ON "CrmPersonField"("crmPersonId", "crmFieldId");
