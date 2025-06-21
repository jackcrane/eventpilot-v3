/*
  Warnings:

  - The values [CAMPAIGN_CREATED,CAMPAIGN_MODIFIED,CAMPAIGN_DELETED] on the enum `LogType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `campaignId` on the `FormField` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `FormResponse` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Logs` table. All the data in the column will be lost.
  - You are about to drop the `Campaign` table. If the table is not empty, all the data it contains will be lost.

*/

-- AlterEnum
BEGIN;
CREATE TYPE "LogType_new" AS ENUM ('USER_CREATED', 'USER_LOGIN', 'USER_PASSWORD_RESET_REQUEST', 'USER_PASSWORD_RESET', 'USER_EMAIL_VERIFICATION_RESENT', 'USER_ACCOUNT_UPDATED', 'USER_EMAIL_PREFERENCES_UPDATED', 'EMAIL_SENT', 'EMAIL_VERIFIED', 'EMAIL_WEBHOOK_RECEIVED', 'FILE_UPLOADED', 'EVENT_CREATED', 'EVENT_MODIFIED', 'EVENT_DELETED', 'FORM_FIELD_CREATED', 'FORM_FIELD_MODIFIED', 'FORM_FIELD_DELETED', 'FORM_RESPONSE_CREATED', 'FORM_RESPONSE_MODIFIED', 'FORM_RESPONSE_DELETED', 'LOCATION_CREATED', 'LOCATION_MODIFIED', 'LOCATION_DELETED', 'JOB_CREATED', 'JOB_MODIFIED', 'JOB_DELETED', 'SHIFT_CREATED', 'SHIFT_MODIFIED', 'SHIFT_DELETED', 'STRIPE_CUSTOMER_CREATED', 'STRIPE_CUSTOMER_UPDATED', 'STRIPE_SETUP_INTENT_CREATED', 'STRIPE_SETUP_INTENT_SUCCEEDED', 'STRIPE_PAYMENT_METHOD_ATTACHED', 'STRIPE_SUBSCRIPTION_CREATED');
ALTER TABLE "Logs" ALTER COLUMN "type" TYPE "LogType_new" USING ("type"::text::"LogType_new");
ALTER TYPE "LogType" RENAME TO "LogType_old";
ALTER TYPE "LogType_new" RENAME TO "LogType";
DROP TYPE "LogType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_userId_fkey";

-- DropForeignKey
ALTER TABLE "FormField" DROP CONSTRAINT "FormField_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "FormResponse" DROP CONSTRAINT "FormResponse_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Logs" DROP CONSTRAINT "Logs_campaignId_fkey";

-- AlterTable
ALTER TABLE "FormField" DROP COLUMN "campaignId";

-- AlterTable
ALTER TABLE "FormResponse" DROP COLUMN "campaignId";

-- AlterTable
ALTER TABLE "Logs" DROP COLUMN "campaignId";

-- DropTable
DROP TABLE "Campaign";
