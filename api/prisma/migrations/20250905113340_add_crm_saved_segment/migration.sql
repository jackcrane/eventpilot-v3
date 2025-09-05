-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "crmSavedSegmentId" TEXT;

-- CreateTable
CREATE TABLE "CrmSavedSegment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT,
    "prompt" TEXT NOT NULL,
    "ast" JSONB NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSavedSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmSavedSegment_eventId_idx" ON "CrmSavedSegment"("eventId");

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_crmSavedSegmentId_fkey" FOREIGN KEY ("crmSavedSegmentId") REFERENCES "CrmSavedSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSavedSegment" ADD CONSTRAINT "CrmSavedSegment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
