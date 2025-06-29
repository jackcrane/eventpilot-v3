-- AlterTable
ALTER TABLE "CrmPerson" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "CrmPersonLink" (
    "id" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "formResponseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPersonLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmPersonLink_formResponseId_key" ON "CrmPersonLink"("formResponseId");

-- AddForeignKey
ALTER TABLE "CrmPersonLink" ADD CONSTRAINT "CrmPersonLink_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPersonLink" ADD CONSTRAINT "CrmPersonLink_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
