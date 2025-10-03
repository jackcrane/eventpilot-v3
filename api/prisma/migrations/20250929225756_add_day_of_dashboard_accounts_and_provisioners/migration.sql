-- CreateTable
CREATE TABLE "DayOfDashboardProvisioner" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "instanceId" TEXT,
    "name" TEXT,
    "pinLookupKey" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "jwtExpiresInSeconds" INTEGER NOT NULL DEFAULT 3600,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "lastPinGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayOfDashboardProvisioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayOfDashboardAccount" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provisionerId" TEXT NOT NULL,
    "instanceId" TEXT,
    "name" TEXT,
    "permissions" TEXT[],
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastIssuedAt" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayOfDashboardAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayOfDashboardProvisioner_pinLookupKey_key" ON "DayOfDashboardProvisioner"("pinLookupKey");

-- CreateIndex
CREATE INDEX "DayOfDashboardProvisioner_eventId_idx" ON "DayOfDashboardProvisioner"("eventId");

-- CreateIndex
CREATE INDEX "DayOfDashboardProvisioner_instanceId_idx" ON "DayOfDashboardProvisioner"("instanceId");

-- CreateIndex
CREATE INDEX "DayOfDashboardAccount_eventId_idx" ON "DayOfDashboardAccount"("eventId");

-- CreateIndex
CREATE INDEX "DayOfDashboardAccount_provisionerId_idx" ON "DayOfDashboardAccount"("provisionerId");

-- CreateIndex
CREATE INDEX "DayOfDashboardAccount_instanceId_idx" ON "DayOfDashboardAccount"("instanceId");

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_provisionerId_fkey" FOREIGN KEY ("provisionerId") REFERENCES "DayOfDashboardProvisioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOfDashboardAccount" ADD CONSTRAINT "DayOfDashboardAccount_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
