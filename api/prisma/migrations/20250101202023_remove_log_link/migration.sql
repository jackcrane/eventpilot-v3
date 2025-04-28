/*
  Warnings:

  - You are about to drop the column `emailId` on the `Logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Logs" DROP CONSTRAINT "Logs_emailId_fkey";

-- AlterTable
ALTER TABLE "Logs" DROP COLUMN "emailId";
