/*
  Warnings:

  - The values [PHONE,BOOLEAN,SELECT,MULTISELECT,DATE,NUMBER] on the enum `RegistrationFieldType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RegistrationFieldType_new" AS ENUM ('TEXT', 'EMAIL', 'TEXTAREA', 'RICHTEXT', 'CHECKBOX', 'DROPDOWN');
ALTER TABLE "RegistrationField" ALTER COLUMN "type" TYPE "RegistrationFieldType_new" USING ("type"::text::"RegistrationFieldType_new");
ALTER TYPE "RegistrationFieldType" RENAME TO "RegistrationFieldType_old";
ALTER TYPE "RegistrationFieldType_new" RENAME TO "RegistrationFieldType";
DROP TYPE "RegistrationFieldType_old";
COMMIT;

-- AlterTable
ALTER TABLE "RegistrationField" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "markdown" TEXT,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "rows" INTEGER,
ALTER COLUMN "label" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationFieldOption" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RegistrationPage" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;
