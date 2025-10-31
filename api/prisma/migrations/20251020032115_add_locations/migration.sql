/*
  Warnings:

  - You are about to drop the column `websitePages` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DayOfDashboardProvisioner" ADD COLUMN     "stripe_location_id" TEXT;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "websitePages",
ADD COLUMN     "stripeTerminalDefaultLocationId" TEXT;

-- CreateTable
CREATE TABLE "stripe_locations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "nickname" TEXT,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "stripe_location_id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_locations_stripe_location_id_key" ON "stripe_locations"("stripe_location_id");

-- CreateIndex
CREATE INDEX "stripe_locations_event_id_deleted_idx" ON "stripe_locations"("event_id", "deleted");

-- CreateIndex
CREATE INDEX "DayOfDashboardProvisioner_stripe_location_id_idx" ON "DayOfDashboardProvisioner"("stripe_location_id");

-- AddForeignKey
ALTER TABLE "DayOfDashboardProvisioner" ADD CONSTRAINT "DayOfDashboardProvisioner_stripe_location_id_fkey" FOREIGN KEY ("stripe_location_id") REFERENCES "stripe_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_locations" ADD CONSTRAINT "stripe_locations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
