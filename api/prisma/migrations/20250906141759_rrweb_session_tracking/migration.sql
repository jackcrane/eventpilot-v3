-- CreateEnum
CREATE TYPE "SessionTerminationReason" AS ENUM ('UNLOAD', 'CLOSE');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "converted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "geolocationId" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "terminationReason" "SessionTerminationReason",
ALTER COLUMN "fileId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SessionChunk" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionChunk_sessionId_idx" ON "SessionChunk"("sessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_geolocationId_fkey" FOREIGN KEY ("geolocationId") REFERENCES "Geolocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChunk" ADD CONSTRAINT "SessionChunk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChunk" ADD CONSTRAINT "SessionChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
