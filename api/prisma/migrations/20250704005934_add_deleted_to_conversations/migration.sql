-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'EMAIL_MARKED_READ';
ALTER TYPE "LogType" ADD VALUE 'EMAIL_MARKED_UNREAD';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InboundEmail" ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;
