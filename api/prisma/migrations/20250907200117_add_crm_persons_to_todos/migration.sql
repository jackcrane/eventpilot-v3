/*
  Warnings:

  - You are about to drop the column `conversationId` on the `TodoItem` table. All the data in the column will be lost.
  - You are about to drop the column `participantRegistrationId` on the `TodoItem` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `TodoItem` table. All the data in the column will be lost.
  - You are about to drop the column `volunteerRegistrationId` on the `TodoItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TodoItem" DROP CONSTRAINT "TodoItem_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "TodoItem" DROP CONSTRAINT "TodoItem_participantRegistrationId_fkey";

-- DropForeignKey
ALTER TABLE "TodoItem" DROP CONSTRAINT "TodoItem_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "TodoItem" DROP CONSTRAINT "TodoItem_volunteerRegistrationId_fkey";

-- AlterTable
ALTER TABLE "TodoItem" DROP COLUMN "conversationId",
DROP COLUMN "participantRegistrationId",
DROP COLUMN "sessionId",
DROP COLUMN "volunteerRegistrationId";

-- CreateTable
CREATE TABLE "_ConversationToTodoItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConversationToTodoItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SessionToTodoItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SessionToTodoItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CrmPersonToTodoItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CrmPersonToTodoItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RegistrationToTodoItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RegistrationToTodoItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TodoItemToVolunteerRegistration" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TodoItemToVolunteerRegistration_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ConversationToTodoItem_B_index" ON "_ConversationToTodoItem"("B");

-- CreateIndex
CREATE INDEX "_SessionToTodoItem_B_index" ON "_SessionToTodoItem"("B");

-- CreateIndex
CREATE INDEX "_CrmPersonToTodoItem_B_index" ON "_CrmPersonToTodoItem"("B");

-- CreateIndex
CREATE INDEX "_RegistrationToTodoItem_B_index" ON "_RegistrationToTodoItem"("B");

-- CreateIndex
CREATE INDEX "_TodoItemToVolunteerRegistration_B_index" ON "_TodoItemToVolunteerRegistration"("B");

-- AddForeignKey
ALTER TABLE "_ConversationToTodoItem" ADD CONSTRAINT "_ConversationToTodoItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationToTodoItem" ADD CONSTRAINT "_ConversationToTodoItem_B_fkey" FOREIGN KEY ("B") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionToTodoItem" ADD CONSTRAINT "_SessionToTodoItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionToTodoItem" ADD CONSTRAINT "_SessionToTodoItem_B_fkey" FOREIGN KEY ("B") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmPersonToTodoItem" ADD CONSTRAINT "_CrmPersonToTodoItem_A_fkey" FOREIGN KEY ("A") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmPersonToTodoItem" ADD CONSTRAINT "_CrmPersonToTodoItem_B_fkey" FOREIGN KEY ("B") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegistrationToTodoItem" ADD CONSTRAINT "_RegistrationToTodoItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegistrationToTodoItem" ADD CONSTRAINT "_RegistrationToTodoItem_B_fkey" FOREIGN KEY ("B") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TodoItemToVolunteerRegistration" ADD CONSTRAINT "_TodoItemToVolunteerRegistration_A_fkey" FOREIGN KEY ("A") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TodoItemToVolunteerRegistration" ADD CONSTRAINT "_TodoItemToVolunteerRegistration_B_fkey" FOREIGN KEY ("B") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
