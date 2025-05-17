/*
  Warnings:

  - Added the required column `endTime` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "endTime" SET DATA TYPE TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "endTime" TEXT NOT NULL,
ADD COLUMN     "startTime" TEXT NOT NULL;
