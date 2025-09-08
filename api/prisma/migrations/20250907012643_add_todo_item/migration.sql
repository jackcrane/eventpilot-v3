-- CreateEnum
CREATE TYPE "TodoItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'TODO_ITEM_CREATED';
ALTER TYPE "LogType" ADD VALUE 'TODO_ITEM_UPDATED';
ALTER TYPE "LogType" ADD VALUE 'TODO_ITEM_DELETED';
ALTER TYPE "LogType" ADD VALUE 'TODO_ITEM_COMMENT_CREATED';
ALTER TYPE "LogType" ADD VALUE 'TODO_ITEM_STATUS_CHANGED';

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "todoItemCommentId" TEXT;

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "todoItemId" TEXT;

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TodoItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "volunteerRegistrationId" TEXT,
    "participantRegistrationId" TEXT,
    "sessionId" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoItemComment" (
    "id" TEXT NOT NULL,
    "todoItemId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoItemComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_todoItemCommentId_fkey" FOREIGN KEY ("todoItemCommentId") REFERENCES "TodoItemComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_todoItemId_fkey" FOREIGN KEY ("todoItemId") REFERENCES "TodoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_volunteerRegistrationId_fkey" FOREIGN KEY ("volunteerRegistrationId") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_participantRegistrationId_fkey" FOREIGN KEY ("participantRegistrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItemComment" ADD CONSTRAINT "TodoItemComment_todoItemId_fkey" FOREIGN KEY ("todoItemId") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
