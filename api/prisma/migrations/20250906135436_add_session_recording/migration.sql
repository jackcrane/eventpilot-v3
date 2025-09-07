-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "registrationId" TEXT,
    "volunteerRegistrationId" TEXT,
    "path" TEXT,
    "pageType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_eventId_instanceId_idx" ON "Session"("eventId", "instanceId");

-- CreateIndex
CREATE INDEX "Session_registrationId_idx" ON "Session"("registrationId");

-- CreateIndex
CREATE INDEX "Session_volunteerRegistrationId_idx" ON "Session"("volunteerRegistrationId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_volunteerRegistrationId_fkey" FOREIGN KEY ("volunteerRegistrationId") REFERENCES "FormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
