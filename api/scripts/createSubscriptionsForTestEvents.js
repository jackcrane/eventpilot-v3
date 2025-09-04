import { stripe } from "#stripe";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";

const events = await prisma.event.findMany({
  include: {
    user: true,
  },
});

for (const event of events) {
  const priceId = process.env.STRIPE_EVENT_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    throw new Error(
      "Missing STRIPE_EVENT_SUBSCRIPTION_PRICE_ID in environment for test script"
    );
  }

  const subscription = await stripe.subscriptions.create({
    customer: event.user.stripe_customerId,
    items: [
      { price: priceId },
    ],
    metadata: {
      eventId: event.id,
    },
  });

  await prisma.logs.create({
    type: LogType.STRIPE_SUBSCRIPTION_CREATED,
    userId: event.userId,
    ip: "::1",
    data: subscription,
  });

  console.log(subscription);
}
