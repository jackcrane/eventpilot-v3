-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "conversationId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
