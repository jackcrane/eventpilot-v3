-- CreateEnum
CREATE TYPE "OutboundAttachmentDeliveryMode" AS ENUM ('ATTACHMENT', 'LINK');

-- CreateTable
CREATE TABLE "OutboundEmailAttachment" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "deliveryMode" "OutboundAttachmentDeliveryMode" NOT NULL DEFAULT 'ATTACHMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundEmailAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OutboundEmailAttachment" ADD CONSTRAINT "OutboundEmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundEmailAttachment" ADD CONSTRAINT "OutboundEmailAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
