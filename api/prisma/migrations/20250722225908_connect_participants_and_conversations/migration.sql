-- CreateTable
CREATE TABLE "_ConversationToCrmPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConversationToCrmPerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ConversationToCrmPerson_B_index" ON "_ConversationToCrmPerson"("B");

-- AddForeignKey
ALTER TABLE "_ConversationToCrmPerson" ADD CONSTRAINT "_ConversationToCrmPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationToCrmPerson" ADD CONSTRAINT "_ConversationToCrmPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
