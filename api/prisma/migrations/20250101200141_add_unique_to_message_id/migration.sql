/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `Email` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");
