/*
  Warnings:

  - You are about to drop the `Emails` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EmailWebhookType" AS ENUM ('DELIVERY', 'OPEN', 'BOUNCE', 'SPAM_COMPLAINT');

-- DropTable
DROP TABLE "Emails";

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailWebhooks" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "type" "EmailWebhookType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailWebhooks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmailWebhooks" ADD CONSTRAINT "EmailWebhooks_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
