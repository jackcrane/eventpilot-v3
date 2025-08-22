/*
  Warnings:

  - Made the column `instanceId` on table `FormField` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `FormResponse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `Job` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `LedgerItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `Location` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `Registration` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `RegistrationField` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `RegistrationFieldResponse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `RegistrationPage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `RegistrationPeriodPricing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `RegistrationPricing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `RegistrationTier` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `Shift` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `Team` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instanceId` on table `UpsellItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FormField" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FormResponse" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LedgerItem" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Registration" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationField" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationFieldResponse" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationPage" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationPeriodPricing" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationPricing" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationTier" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "instanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "UpsellItem" ALTER COLUMN "instanceId" SET NOT NULL;
