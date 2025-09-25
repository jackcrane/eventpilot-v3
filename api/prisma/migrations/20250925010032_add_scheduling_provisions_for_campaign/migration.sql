-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "sendAt" TIMESTAMP(3),
ADD COLUMN     "sendAtTz" TEXT,
ADD COLUMN     "sendEffortStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendImmediately" BOOLEAN NOT NULL DEFAULT false;
