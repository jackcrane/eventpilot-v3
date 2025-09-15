-- CreateEnum
CREATE TYPE "CampaignEmailQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT');

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEmailQueue" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CampaignEmailQueueStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignEmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignEmailQueue_campaignId_idx" ON "CampaignEmailQueue"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignEmailQueue_crmPersonId_idx" ON "CampaignEmailQueue"("crmPersonId");

-- CreateIndex
CREATE INDEX "CampaignEmailQueue_status_idx" ON "CampaignEmailQueue"("status");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEmailQueue" ADD CONSTRAINT "CampaignEmailQueue_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEmailQueue" ADD CONSTRAINT "CampaignEmailQueue_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEmailQueue" ADD CONSTRAINT "CampaignEmailQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
