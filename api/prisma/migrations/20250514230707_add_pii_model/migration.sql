-- CreateTable
CREATE TABLE "PII" (
    "id" TEXT NOT NULL,
    "formResponseId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "fingerprint" TEXT,
    "location" JSONB,
    "tz" TEXT,
    "browser" TEXT,
    "device" TEXT,
    "os" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PII_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PII_formResponseId_key" ON "PII"("formResponseId");

-- AddForeignKey
ALTER TABLE "PII" ADD CONSTRAINT "PII_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
