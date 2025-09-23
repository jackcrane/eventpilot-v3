-- CreateEnum
CREATE TYPE "MailingListMemberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'INACTIVE', 'DELETED');

-- AlterEnum
ALTER TYPE "LogType" ADD VALUE 'MAILING_LIST_CREATED';
ALTER TYPE "LogType" ADD VALUE 'MAILING_LIST_MODIFIED';
ALTER TYPE "LogType" ADD VALUE 'MAILING_LIST_DELETED';
ALTER TYPE "LogType" ADD VALUE 'MAILING_LIST_MEMBER_CREATED';
ALTER TYPE "LogType" ADD VALUE 'MAILING_LIST_MEMBER_MODIFIED';
ALTER TYPE "LogType" ADD VALUE 'MAILING_LIST_MEMBER_DELETED';

-- CreateTable
CREATE TABLE "MailingList" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MailingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailingListMember" (
    "id" TEXT NOT NULL,
    "mailingListId" TEXT NOT NULL,
    "crmPersonId" TEXT NOT NULL,
    "status" "MailingListMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MailingListMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailingList_eventId_title_key" ON "MailingList"("eventId", "title");
CREATE UNIQUE INDEX "MailingListMember_mailingListId_crmPersonId_key" ON "MailingListMember"("mailingListId", "crmPersonId");

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN "mailingListId" TEXT;
ALTER TABLE "Logs" ADD COLUMN "mailingListMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "MailingList" ADD CONSTRAINT "MailingList_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailingListMember" ADD CONSTRAINT "MailingListMember_mailingListId_fkey" FOREIGN KEY ("mailingListId") REFERENCES "MailingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailingListMember" ADD CONSTRAINT "MailingListMember_crmPersonId_fkey" FOREIGN KEY ("crmPersonId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_mailingListId_fkey" FOREIGN KEY ("mailingListId") REFERENCES "MailingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_mailingListMemberId_fkey" FOREIGN KEY ("mailingListMemberId") REFERENCES "MailingListMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
