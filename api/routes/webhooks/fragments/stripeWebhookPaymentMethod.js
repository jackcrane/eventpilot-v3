import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { stripe } from "#stripe";
import { resolveStripeAffiliations } from "./stripeWebhookAffiliations.js";
import { ensureStripeLog } from "./stripeWebhookLogs.js";

export const handlePaymentMethodAttachedWebhook = async ({ stripeEvent }) => {
  const paymentMethod = stripeEvent.data.object;
  const customerId = paymentMethod.customer;

  if (!customerId) {
    console.warn("[STRIPE] Attached payment method has no customer ID");
    return;
  }

  const eventRecord = await prisma.event.findFirst({
    where: { stripe_customerId: customerId },
    select: { id: true },
  });

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });

  const affiliations = await resolveStripeAffiliations(paymentMethod);

  await ensureStripeLog({
    type: LogType.STRIPE_PAYMENT_METHOD_ATTACHED,
    objectId: paymentMethod.id,
    data: paymentMethod,
    eventId: affiliations.eventId ?? eventRecord?.id ?? null,
    crmPersonId: affiliations.crmPersonId ?? null,
  });

  console.log(
    `[STRIPE] PaymentMethod ${paymentMethod.id} set as default for customer ${customerId}`
  );
};
