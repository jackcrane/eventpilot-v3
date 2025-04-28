-- CreateTable
CREATE TABLE "Geolocation" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Geolocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Geolocation_ip_key" ON "Geolocation"("ip");
