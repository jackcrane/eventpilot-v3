-- Add stripeTerminalDefaultLocationId to Event
ALTER TABLE "Event"
ADD COLUMN "stripeTerminalDefaultLocationId" TEXT;
