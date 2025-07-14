-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "useHostedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "willForwardEmail" BOOLEAN NOT NULL DEFAULT true;
