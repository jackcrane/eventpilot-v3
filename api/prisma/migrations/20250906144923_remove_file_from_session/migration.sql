/*
  Warnings:

  - You are about to drop the column `fileId` on the `Session` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_fileId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "fileId";
