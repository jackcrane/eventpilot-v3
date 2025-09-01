import { prisma } from "#prisma";

// Public lookup by code to preview coupon before applying
export const get = [
  async (req, res) => {
    const { eventId } = req.params;
    const { code } = req.query;
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ message: "Missing coupon code" });
    }
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.trim(),
        eventId,
        instanceId: req.instanceId,
        deleted: false,
      },
      select: {
        id: true,
        title: true,
        code: true,
        discountType: true,
        amount: true,
        appliesTo: true,
        endsAt: true,
        endsAtTz: true,
        maxRedemptions: true,
      },
    });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    // Optionally compute redemptions used
    let redemptions = 0;
    if (coupon.maxRedemptions !== -1) {
      redemptions = await prisma.registration.count({
        where: {
          couponId: coupon.id,
          deleted: false,
          finalized: true,
        },
      });
    }

    return res.json({ coupon: { ...coupon, redemptions } });
  },
];

