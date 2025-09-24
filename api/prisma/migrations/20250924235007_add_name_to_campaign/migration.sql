/*
  Warnings:

  - You are about to drop the `CampaignEmailQueue` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `mailingListId` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CampaignEmailQueue" DROP CONSTRAINT "CampaignEmailQueue_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignEmailQueue" DROP CONSTRAINT "CampaignEmailQueue_crmPersonId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignEmailQueue" DROP CONSTRAINT "CampaignEmailQueue_userId_fkey";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "mailingListId" TEXT NOT NULL,
ADD COLUMN     "templateId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "campaignId" TEXT;

-- DropTable
DROP TABLE "CampaignEmailQueue";

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_mailingListId_fkey" FOREIGN KEY ("mailingListId") REFERENCES "MailingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
