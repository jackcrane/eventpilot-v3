import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";
import { generateTeamCode } from "#util/generateTeamCode";
import { reportApiError } from "#util/reportApiError.js";

export const couponSchema = z
  .object({
    title: z.string().min(2).max(128),
    code: z.string().min(2).max(32).optional().or(z.literal("")),
    discountType: z.enum(["FLAT", "PERCENT"]),
    amount: z.number().positive(),
    appliesTo: z.enum(["REGISTRATION", "UPSELLS", "BOTH"]).default("BOTH"),
    maxRedemptions: z
      .number()
      .int()
      .refine((n) => n === -1 || n >= 1, {
        message: "Must be -1 (unlimited) or >= 1",
      })
      .optional(),
    endsAt: z.string().datetime().nullable().optional(),
    endsAtTz: z.string().nullable().optional(),
  })
  .refine((data) => !data.endsAt || !!data.endsAtTz, {
    message: "Timezone required when Ends At is set",
    path: ["endsAtTz"],
  });

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const parsed = couponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }
    const { eventId } = req.params;
    const instanceId = req.instanceId;
    let {
      title,
      code,
      discountType,
      amount,
      appliesTo,
      maxRedemptions,
      endsAt,
      endsAtTz,
    } = parsed.data;

    if (discountType === "PERCENT" && amount > 100) {
      return res
        .status(400)
        .json({
          message: { amount: { _errors: ["Percent cannot exceed 100"] } },
        });
    }

    let codeToUse = (code || "").trim();
    if (!codeToUse) codeToUse = generateTeamCode(8);

    try {
      let coupon;
      for (let i = 0; i < 5; i++) {
        try {
          coupon = await prisma.coupon.create({
            data: {
              title,
              code: codeToUse,
              discountType,
              amount,
              appliesTo,
              maxRedemptions: maxRedemptions ?? -1,
              endsAt: endsAt ? new Date(endsAt) : null,
              endsAtTz: endsAt ? endsAtTz : null,
              event: { connect: { id: eventId } },
              instance: { connect: { id: instanceId } },
            },
          });
          break;
        } catch (e) {
          if (e?.code === "P2002" && !code) {
            codeToUse = generateTeamCode(8);
            continue;
          }
          throw e;
        }
      }

      const coupons = await prisma.coupon.findMany({
        where: { eventId, instanceId, deleted: false },
        orderBy: { createdAt: "asc" },
      });

      const redemptionCounts = await prisma.registration.groupBy({
        by: ["couponId"],
        where: {
          couponId: { in: coupons.map((c) => c.id) },
          deleted: false,
          finalized: true,
        },
        _count: { couponId: true },
      });
      const countsMap = Object.fromEntries(
        redemptionCounts.map((r) => [r.couponId, r._count.couponId])
      );

      return res.json({
        coupons: coupons.map((c) => ({
          ...c,
          redemptions: countsMap[c.id] || 0,
        })),
        coupon,
      });
    } catch (e) {
      if (e?.code === "P2002") {
        return res.status(400).json({
          message: { code: { _errors: ["Code must be unique"] } },
        });
      }
      reportApiError(e, req);
      return res.status(500).json({ message: e.message });
    }
  },
];

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;
    const coupons = await prisma.coupon.findMany({
      where: { eventId, instanceId, deleted: false },
      orderBy: { createdAt: "asc" },
    });

    const redemptionCounts = await prisma.registration.groupBy({
      by: ["couponId"],
      where: {
        couponId: { in: coupons.map((c) => c.id) },
        deleted: false,
        finalized: true,
      },
      _count: { couponId: true },
    });
    const countsMap = Object.fromEntries(
      redemptionCounts.map((r) => [r.couponId, r._count.couponId])
    );

    return res.json({
      coupons: coupons.map((c) => ({
        ...c,
        redemptions: countsMap[c.id] || 0,
      })),
    });
  },
];

export const query = [(req, res) => res.json(zerialize(couponSchema))];
