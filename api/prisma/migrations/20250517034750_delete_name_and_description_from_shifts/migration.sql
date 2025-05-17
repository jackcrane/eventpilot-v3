/*
  Warnings:

  - You are about to drop the column `description` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Shift` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "description",
DROP COLUMN "name";
