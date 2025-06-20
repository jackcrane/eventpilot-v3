import { stripe } from "#stripe";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";

const events = await prisma.event.findMany({
  include: {
    user: true,
  },
});

for (const event of events) {
  const subscription = await stripe.subscriptions.create({
    customer: event.user.stripe_customerId,
    items: [
      {
        price: "price_1RRbcBIZm3Kzv7N0hZUMowir",
      },
      {
        price: "price_1RRbcBIZm3Kzv7N0SFA9BEG5",
      },
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
