-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'EMAIL_WEBHOOK_BOUNCE';
ALTER TYPE "LogType" ADD VALUE 'EMAIL_WEBHOOK_DELIVERY';
ALTER TYPE "LogType" ADD VALUE 'EMAIL_WEBHOOK_OPEN';
ALTER TYPE "LogType" ADD VALUE 'EMAIL_WEBHOOK_SPAM_COMPLAINT';
ALTER TYPE "LogType" ADD VALUE 'EMAIL_WEBHOOK_LINK_CLICK';
