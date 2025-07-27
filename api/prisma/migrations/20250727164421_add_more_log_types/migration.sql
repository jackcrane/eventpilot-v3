-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'UPSELL_ITEM_CREATED';
ALTER TYPE "LogType" ADD VALUE 'UPSELL_ITEM_MODIFIED';
ALTER TYPE "LogType" ADD VALUE 'UPSELL_ITEM_DELETED';
ALTER TYPE "LogType" ADD VALUE 'UPSELL_ITEM_STRIPE_PRICE_CREATED';
ALTER TYPE "LogType" ADD VALUE 'UPSELL_ITEM_STRIPE_PRICE_MODIFIED';
ALTER TYPE "LogType" ADD VALUE 'UPSELL_ITEM_STRIPE_PRICE_DELETED';

-- AlterTable
ALTER TABLE "Logs" ADD COLUMN     "upsellItemId" TEXT;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_upsellItemId_fkey" FOREIGN KEY ("upsellItemId") REFERENCES "UpsellItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
