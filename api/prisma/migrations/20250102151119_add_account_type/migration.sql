-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('MANAGER', 'DISPATCHER', 'INSTRUCTOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'INSTRUCTOR';
