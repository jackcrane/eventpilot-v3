-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "remainingStepsOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_eventId_key" ON "Configuration"("eventId");

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
