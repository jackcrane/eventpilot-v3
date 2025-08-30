import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { serializeError } from "#serializeError";
import { upsellSchema } from "./index";
import { LogType } from "@prisma/client";
import { zerialize } from "zodex";

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const parseResult = upsellSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }
    const { name, description, price, inventory } = parseResult.data;
    const { eventId, upsellItemId } = req.params;

    // load existing
    const before = await prisma.upsellItem.findFirst({
      where: { id: upsellItemId, eventId, instanceId: req.instanceId },
    });
    if (!before) return res.status(404).json({ message: "Upsell not found" });

    const { stripeConnectedAccountId } = await prisma.event.findUnique({
      where: { id: eventId },
      select: { stripeConnectedAccountId: true },
    });

    // 1) update product metadata
    await stripe.products.update(
      before.stripe_productId,
      { name, description },
      { stripeAccount: stripeConnectedAccountId }
    );

    let priceIdToInsert;
    if (before.price !== price) {
      // 2) create replacement price
      const replacementPrice = await stripe.prices.create(
        {
          product: before.stripe_productId,
          currency: "usd",
          unit_amount: Math.round(price * 100),
          nickname: `Upsell Item ${name}`,
        },
        { stripeAccount: stripeConnectedAccountId }
      );

      // 3) deactivate old price
      await stripe.prices.update(
        before.stripe_priceId,
        { active: false },
        { stripeAccount: stripeConnectedAccountId }
      );

      // 4) point product default_price at the new one
      await stripe.products.update(
        before.stripe_productId,
        { default_price: replacementPrice.id },
        { stripeAccount: stripeConnectedAccountId }
      );

      await prisma.logs.create({
        data: {
          type: LogType.UPSELL_ITEM_PRICE_CHANGED,
          eventId,
          upsellItemId: upsell.id,
          userId: req.user.id,
          data: JSON.stringify({ before: before.price, after: price }),
        },
      });

      priceIdToInsert = replacementPrice.id;
    } else {
      priceIdToInsert = before.stripe_priceId;
    }

    // 5) persist new price + fields
    const upsell = await prisma.upsellItem.update({
      where: { id: upsellItemId },
      data: {
        name,
        description,
        price,
        inventory,
        stripe_priceId: priceIdToInsert,
      },
    });

    // 6) log
    await prisma.logs.createMany({
      data: [
        {
          type: LogType.UPSELL_ITEM_MODIFIED,
          eventId,
          upsellItemId: upsell.id,
          userId: req.user.id,
          data: JSON.stringify({ before, after: upsell }),
        },
        {
          type: LogType.STRIPE_PRICE_UPDATED,
          eventId,
          upsellItemId: upsell.id,
          userId: req.user.id,
        },
      ],
    });

    return res.json({ upsell });
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, upsellItemId } = req.params;
    const upsell = await prisma.upsellItem.update({
      where: { id: upsellItemId },
      data: { deleted: true },
    });
    const { stripeConnectedAccountId } = await prisma.event.findUnique({
      where: { id: eventId },
      select: { stripeConnectedAccountId: true },
    });

    await stripe.products.update(
      upsell.stripe_productId,
      { active: false },
      { stripeAccount: stripeConnectedAccountId }
    );

    // deactivate price
    await stripe.prices.update(
      upsell.stripe_priceId,
      { active: false },
      { stripeAccount: stripeConnectedAccountId }
    );

    await prisma.logs.createMany({
      data: [
        {
          type: LogType.UPSELL_ITEM_DELETED,
          eventId,
          upsellItemId: upsell.id,
          userId: req.user.id,
          data: JSON.stringify(upsell),
        },
        {
          type: LogType.STRIPE_PRICE_DELETED,
          eventId,
          upsellItemId: upsell.id,
          userId: req.user.id,
        },
      ],
    });

    return res.json({ upsell });
  },
];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, upsellItemId } = req.params;
    const upsell = await prisma.upsellItem.findFirst({
      where: {
        id: upsellItemId,
        eventId,
        deleted: false,
      },
    });
    if (!upsell) return res.status(404).json({ message: "Upsell not found" });
    return res.json({ upsell });
  },
];

export const query = [(req, res) => res.json(zerialize(upsellSchema))];
