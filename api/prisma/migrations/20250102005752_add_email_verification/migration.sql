-- AlterEnum
ALTER TYPE "EmailWebhookType" ADD VALUE 'LINK_CLICK';

-- AlterTable
ALTER TABLE "EmailVerification" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
