/*
  Warnings:

  - You are about to drop the column `timezone` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `Shift` table. All the data in the column will be lost.
  - Added the required column `endTimeTz` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTimeTz` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTimeTz` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTimeTz` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "endTimeTz" TEXT NOT NULL,
ADD COLUMN     "startTimeTz" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "timezone",
ADD COLUMN     "endTimeTz" TEXT NOT NULL,
ADD COLUMN     "startTimeTz" TEXT NOT NULL;
