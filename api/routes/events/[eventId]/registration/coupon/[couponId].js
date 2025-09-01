import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";

const couponUpdateSchema = z.object({
  title: z.string().min(2).max(128),
  code: z.string().min(2).max(32),
  discountType: z.enum(["FLAT", "PERCENT"]),
  amount: z.number().positive(),
  appliesTo: z.enum(["REGISTRATION", "UPSELLS", "BOTH"]).default("BOTH"),
  maxRedemptions: z
    .number()
    .int()
    .refine((n) => n === -1 || n >= 1, {
      message: "Must be -1 (unlimited) or >= 1",
    }),
  endsAt: z.string().datetime().nullable().optional(),
  endsAtTz: z.string().nullable().optional(),
}).refine((data) => !data.endsAt || !!data.endsAtTz, {
  message: "Timezone required when Ends At is set",
  path: ["endsAtTz"],
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { couponId } = req.params;
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) return res.status(404).json({ message: "Not found" });
    return res.json({ coupon });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const parsed = couponUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }
    const { couponId, eventId } = req.params;
    const instanceId = req.instanceId;
    let { title, code, discountType, amount, appliesTo, maxRedemptions, endsAt, endsAtTz } =
      parsed.data;

    if (discountType === "PERCENT" && amount > 100) {
      return res
        .status(400)
        .json({ message: { amount: { _errors: ["Percent cannot exceed 100"] } } });
    }

    try {
      const coupon = await prisma.coupon.update({
        where: { id: couponId },
        data: {
          title,
          code,
          discountType,
          amount,
          appliesTo,
          maxRedemptions: maxRedemptions ?? -1,
          endsAt: endsAt ? new Date(endsAt) : null,
          endsAtTz: endsAt ? endsAtTz : null,
        },
      });

      const coupons = await prisma.coupon.findMany({
        where: { eventId, instanceId, deleted: false },
        orderBy: { createdAt: "asc" },
      });
      const redemptionCounts = await prisma.registration.groupBy({
        by: ["couponId"],
        where: { couponId: { in: coupons.map((c) => c.id) }, deleted: false, finalized: true },
        _count: { couponId: true },
      });
      const countsMap = Object.fromEntries(
        redemptionCounts.map((r) => [r.couponId, r._count.couponId])
      );

      return res.json({
        coupon,
        coupons: coupons.map((c) => ({ ...c, redemptions: countsMap[c.id] || 0 })),
      });
    } catch (e) {
      if (e?.code === "P2002") {
        return res.status(400).json({ message: { code: { _errors: ["Code must be unique"] } } });
      }
      return res.status(500).json({ message: e.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { couponId, eventId } = req.params;
    const instanceId = req.instanceId;
    await prisma.coupon.update({ where: { id: couponId }, data: { deleted: true } });

    const coupons = await prisma.coupon.findMany({
      where: { eventId, instanceId, deleted: false },
      orderBy: { createdAt: "asc" },
    });
    const redemptionCounts = await prisma.registration.groupBy({
      by: ["couponId"],
      where: { couponId: { in: coupons.map((c) => c.id) }, deleted: false, finalized: true },
      _count: { couponId: true },
    });
    const countsMap = Object.fromEntries(
      redemptionCounts.map((r) => [r.couponId, r._count.couponId])
    );

    return res.json({
      coupons: coupons.map((c) => ({ ...c, redemptions: countsMap[c.id] || 0 })),
    });
  },
];

export const query = [(req, res) => res.json(zerialize(couponUpdateSchema))];
