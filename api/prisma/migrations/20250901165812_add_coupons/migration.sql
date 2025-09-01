-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('FLAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "CouponAppliesTo" AS ENUM ('REGISTRATION', 'UPSELLS', 'BOTH');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "couponId" TEXT;

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "appliesTo" "CouponAppliesTo" NOT NULL,
    "maxRedemptions" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EventInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
