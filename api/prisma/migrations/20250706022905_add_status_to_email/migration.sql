-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'BOUNCED');

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "status" "EmailStatus" NOT NULL DEFAULT 'SENT';
