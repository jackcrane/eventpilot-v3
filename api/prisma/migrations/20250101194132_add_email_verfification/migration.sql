-- AlterEnum
ALTER TYPE "LogType" ADD VALUE 'EMAIL_VERIFIED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
