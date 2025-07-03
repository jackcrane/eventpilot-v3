/*
  Warnings:

  - A unique constraint covering the columns `[inboundEmailAttachmentId]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "inboundEmailAttachmentId" TEXT;

-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromMailboxHash" TEXT,
    "originalRecipient" TEXT,
    "subject" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "replyTo" TEXT,
    "mailboxHash" TEXT,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "strippedTextReply" TEXT,
    "tag" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEmailHeaders" (
    "id" TEXT NOT NULL,
    "inboundEmailId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "InboundEmailHeaders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEmailAttachment" (
    "id" TEXT NOT NULL,
    "inboundEmailId" TEXT NOT NULL,
    "fileId" TEXT,

    CONSTRAINT "InboundEmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEmailParticipant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "mailboxHash" TEXT,
    "inboundEmailToId" TEXT,
    "inboundEmailCcId" TEXT,
    "inboundEmailBccId" TEXT,

    CONSTRAINT "InboundEmailParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmailAttachment_fileId_key" ON "InboundEmailAttachment"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "File_inboundEmailAttachmentId_key" ON "File"("inboundEmailAttachmentId");

-- AddForeignKey
ALTER TABLE "InboundEmailHeaders" ADD CONSTRAINT "InboundEmailHeaders_inboundEmailId_fkey" FOREIGN KEY ("inboundEmailId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmailAttachment" ADD CONSTRAINT "InboundEmailAttachment_inboundEmailId_fkey" FOREIGN KEY ("inboundEmailId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmailAttachment" ADD CONSTRAINT "InboundEmailAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmailParticipant" ADD CONSTRAINT "InboundEmailParticipant_inboundEmailToId_fkey" FOREIGN KEY ("inboundEmailToId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmailParticipant" ADD CONSTRAINT "InboundEmailParticipant_inboundEmailCcId_fkey" FOREIGN KEY ("inboundEmailCcId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmailParticipant" ADD CONSTRAINT "InboundEmailParticipant_inboundEmailBccId_fkey" FOREIGN KEY ("inboundEmailBccId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
