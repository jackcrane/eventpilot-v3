import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { LogType } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";

export const upsellSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(512).default(""),
  price: z.number().min(0),
  inventory: z.number().min(-1),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const parseResult = upsellSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }
    const { name, description, price, inventory } = parseResult.data;
    const { eventId } = req.params;

    // fetch connected account
    const { stripeConnectedAccountId } = await prisma.event.findUnique({
      where: { id: eventId },
      select: { stripeConnectedAccountId: true },
    });

    // 1) create a Stripe Product
    const product = await stripe.products.create(
      { name, description: description?.length > 0 ? description : undefined },
      { stripeAccount: stripeConnectedAccountId }
    );

    // 2) create the initial Price
    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        currency: "usd",
        unit_amount: Math.round(price * 100),
        nickname: `Upsell Item ${name}`,
      },
      { stripeAccount: stripeConnectedAccountId }
    );

    // 3) persist both IDs
    const upsell = await prisma.upsellItem.create({
      data: {
        eventId,
        name,
        description,
        price,
        inventory,
        stripe_productId: product.id,
        stripe_priceId: stripePrice.id,
      },
    });

    // 4) log
    await prisma.logs.createMany({
      data: [
        {
          type: LogType.UPSELL_ITEM_CREATED,
          eventId,
          userId: req.user.id,
          data: JSON.stringify(upsell),
          upsellItemId: upsell.id,
        },
        {
          type: LogType.STRIPE_PRICE_CREATED,
          eventId,
          userId: req.user.id,
          data: JSON.stringify(stripePrice),
          upsellItemId: upsell.id,
        },
      ],
    });

    const upsells = await prisma.upsellItem.findMany({
      where: { eventId, deleted: false },
      include: { images: true },
    });
    return res.json({ upsells });
  },
];

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const upsells = await prisma.upsellItem.findMany({
      where: { eventId, deleted: false },
      include: {
        images: true,
        registrations: {
          where: {
            registration: {
              finalized: true,
            },
          },
          select: {
            quantity: true,
          },
        },
      },
    });

    let upsellsToReturn = upsells.map((item) => {
      const sold = item.registrations.reduce((sum, r) => sum + r.quantity, 0);
      return {
        ...item,
        sold,
        available: item.inventory > sold,
      };
    });

    if (!req.hasUser || req.user.accountType !== "MANAGER") {
      upsellsToReturn = upsellsToReturn.map((item) => ({
        ...item,
        sold: undefined,
        registrations: undefined,
        inventory: undefined,
        stripe_priceId: undefined,
        stripe_productId: undefined,
      }));
    }

    return res.json({
      upsells: upsellsToReturn,
    });
  },
];

export const query = [(req, res) => res.json(zerialize(upsellSchema))];
