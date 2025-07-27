-- AlterTable
ALTER TABLE "File" ADD COLUMN     "upsellItemId" TEXT;

-- AlterTable
ALTER TABLE "RegistrationPeriodPricing" ADD COLUMN     "stripe_priceId" TEXT;

-- AlterTable
ALTER TABLE "UpsellItem" ADD COLUMN     "stripe_priceId" TEXT;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_upsellItemId_fkey" FOREIGN KEY ("upsellItemId") REFERENCES "UpsellItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
