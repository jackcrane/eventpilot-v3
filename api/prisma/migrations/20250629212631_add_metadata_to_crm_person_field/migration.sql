-- AlterEnum
ALTER TYPE "CrmFieldType" ADD VALUE 'ADDRESS';

-- AlterTable
ALTER TABLE "CrmPersonField" ADD COLUMN     "metadata" JSONB;
