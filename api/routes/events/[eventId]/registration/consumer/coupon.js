import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { setupStripePI } from "../fragments/consumer/registrationRequiresPayment";
import { finalizeRegistration } from "../../../../../util/finalizeRegistration";

const applyCouponSchema = z.object({
  registrationId: z.string().min(1),
  couponCode: z.string().min(1).max(32),
});

export const post = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const parsed = applyCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }
      const { registrationId, couponCode } = parsed.data;

      const [event, registration] = await Promise.all([
        prisma.event.findUnique({ where: { id: eventId } }),
        prisma.registration.findUnique({
          where: { id: registrationId },
          include: { upsells: true },
        }),
      ]);

      if (!registration || registration.eventId !== eventId) {
        return res.status(404).json({ message: "Registration not found" });
      }

      const instanceId = registration.instanceId;
      const now = new Date();

      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.trim(),
          eventId,
          instanceId,
          deleted: false,
        },
      });
      if (!coupon)
        return res.status(400).json({ message: "Invalid coupon code" });
      if (coupon.endsAt && new Date(coupon.endsAt) < now)
        return res.status(400).json({ message: "Coupon has expired" });

      if (coupon.maxRedemptions !== -1) {
        const used = await prisma.registration.count({
          where: { couponId: coupon.id, deleted: false, finalized: true },
        });
        if (used >= coupon.maxRedemptions)
          return res
            .status(400)
            .json({ message: "Coupon has reached its redemption limit" });
      }

      // Attach coupon to registration
      await prisma.registration.update({
        where: { id: registrationId },
        data: { couponId: coupon.id },
      });

      // Compute totals from snapshots
      const registrationTotal = registration.priceSnapshot || 0;
      const upsellsTotal = (registration.upsells || []).reduce(
        (sum, u) => sum + (u.priceSnapshot || 0) * (u.quantity || 1),
        0
      );
      const totalBefore = registrationTotal + upsellsTotal;

      let eligible = 0;
      if (coupon.appliesTo === "BOTH") eligible = totalBefore;
      else if (coupon.appliesTo === "REGISTRATION")
        eligible = registrationTotal;
      else if (coupon.appliesTo === "UPSELLS") eligible = upsellsTotal;

      let discount = 0;
      if (eligible > 0) {
        if (coupon.discountType === "FLAT") discount = coupon.amount;
        else if (coupon.discountType === "PERCENT")
          discount = (eligible * coupon.amount) / 100;
        if (discount > eligible) discount = eligible;
      }

      let total = totalBefore - discount;
      if (total < 0) total = 0;

      const requiresPayment = total >= 0.3;

      if (!requiresPayment) {
        await finalizeRegistration({ registrationId, eventId });
        return res.json({
          finalized: true,
          requiresPayment: false,
          price: total,
        });
      }

      const clientSecret = await setupStripePI(
        total,
        event,
        registrationId,
        instanceId
      );

      return res.json({
        requiresPayment: true,
        stripePIClientSecret: clientSecret,
        price: total,
        finalized: false,
        coupon: {
          id: coupon.id,
          title: coupon.title,
          code: coupon.code,
          discountType: coupon.discountType,
          amount: coupon.amount,
          appliesTo: coupon.appliesTo,
        },
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: error?.message || "Server error" });
    }
  },
];

const removeSchema = z.object({ registrationId: z.string().min(1) });

export const del = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const parsed = removeSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }
      const { registrationId } = parsed.data;

      const [event, registration] = await Promise.all([
        prisma.event.findUnique({ where: { id: eventId } }),
        prisma.registration.findUnique({
          where: { id: registrationId },
          include: { upsells: true },
        }),
      ]);
      if (!registration || registration.eventId !== eventId) {
        return res.status(404).json({ message: "Registration not found" });
      }
      const instanceId = registration.instanceId;

      // Detach coupon
      await prisma.registration.update({
        where: { id: registrationId },
        data: { couponId: null },
      });

      const registrationTotal = registration.priceSnapshot || 0;
      const upsellsTotal = (registration.upsells || []).reduce(
        (sum, u) => sum + (u.priceSnapshot || 0) * (u.quantity || 1),
        0
      );
      const total = registrationTotal + upsellsTotal;
      const requiresPayment = total >= 0.3;

      if (!requiresPayment) {
        await finalizeRegistration({ registrationId, eventId });
        return res.json({
          finalized: true,
          requiresPayment: false,
          price: total,
        });
      }

      const clientSecret = await setupStripePI(
        total,
        event,
        registrationId,
        instanceId
      );

      return res.json({
        requiresPayment: true,
        stripePIClientSecret: clientSecret,
        price: total,
        finalized: false,
        coupon: null,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: error?.message || "Server error" });
    }
  },
];
