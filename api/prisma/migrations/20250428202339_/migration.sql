/*
  Warnings:

  - The values [DISPATCHER,INSTRUCTOR] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('MANAGER');
ALTER TABLE "User" ALTER COLUMN "accountType" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "accountType" TYPE "AccountType_new" USING ("accountType"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
ALTER TABLE "User" ALTER COLUMN "accountType" SET DEFAULT 'MANAGER';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "accountType" SET DEFAULT 'MANAGER';
