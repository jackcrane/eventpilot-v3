import { prisma } from "#prisma";

export const handleSubscriptionWebhook = async ({ stripeEvent }) => {
  const subscription = stripeEvent.data.object;
  const status = subscription.status;

  let eventRecord = null;
  const metadataEventId = subscription.metadata?.eventId;

  if (metadataEventId) {
    eventRecord = await prisma.event.findFirst({
      where: { id: metadataEventId },
    });
  }

  if (!eventRecord) {
    eventRecord = await prisma.event.findFirst({
      where: { stripe_subscriptionId: subscription.id },
    });
  }

  if (!eventRecord) {
    return;
  }

  await prisma.event.update({
    where: { id: eventRecord.id },
    data: {
      stripe_subscriptionId: subscription.id,
      goodPaymentStanding: ["active", "trialing"].includes(status || ""),
    },
  });
};

export const handleInvoicePaymentWebhook = async ({
  stripeEvent,
  goodPaymentStanding,
}) => {
  const invoice = stripeEvent.data.object;
  const subscriptionId = invoice.subscription;

  if (typeof subscriptionId !== "string") {
    return;
  }

  const eventRecord = await prisma.event.findFirst({
    where: { stripe_subscriptionId: subscriptionId },
  });

  if (!eventRecord) {
    return;
  }

  await prisma.event.update({
    where: { id: eventRecord.id },
    data: { goodPaymentStanding },
  });
};
