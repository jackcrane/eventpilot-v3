/*
  Warnings:

  - The `browser` column on the `PII` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `device` column on the `PII` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `os` column on the `PII` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "PII" DROP COLUMN "browser",
ADD COLUMN     "browser" JSONB,
DROP COLUMN "device",
ADD COLUMN     "device" JSONB,
DROP COLUMN "os",
ADD COLUMN     "os" JSONB;
