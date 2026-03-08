import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { stripe } from "#stripe";
import { finalizeRegistration } from "../../../util/finalizeRegistration.js";
import {
  createLedgerItemForRegistration,
  ensurePointOfSaleLedgerForPaymentIntent,
} from "../../../util/ledger.js";
import { ensureCrmPersonForPaymentIntent } from "../../../util/crmPersonFromPaymentIntent.js";
import { resolveStripeAffiliations } from "./stripeWebhookAffiliations.js";
import {
  ensureStripeLog,
  syncStripeLogAssociations,
} from "./stripeWebhookLogs.js";

const logCardMatchAttempt = ({
  paymentIntent,
  eventId,
  crmPersonId,
  cardMatchInfo,
}) => {
  if (!cardMatchInfo?.attempted) {
    return;
  }

  if (cardMatchInfo.matched && crmPersonId) {
    console.log(
      `[STRIPE][CRM] PaymentIntent ${paymentIntent.id} linked to CRM person ${crmPersonId} via ${cardMatchInfo.matchType}`,
    );
    return;
  }

  console.warn(
    `[STRIPE][CRM] PaymentIntent ${paymentIntent.id} captured without CRM person match`,
    {
      eventId,
      paymentMethodId: cardMatchInfo?.context?.paymentMethodId || null,
      fingerprint: cardMatchInfo?.context?.fingerprint || null,
      brand: cardMatchInfo?.context?.brand || null,
      last4: cardMatchInfo?.context?.last4 || null,
      expMonth: cardMatchInfo?.context?.expMonth ?? null,
      expYear: cardMatchInfo?.context?.expYear ?? null,
      cardholderName: cardMatchInfo?.context?.cardholderName || null,
    },
  );
};

const ensurePaymentIntentCrmPerson = async ({
  paymentIntent,
  eventId,
  crmPersonId,
  stripeAccountId,
  scope,
  cardMatchInfo,
}) => {
  if (crmPersonId || !eventId || !stripeAccountId) {
    return crmPersonId;
  }

  const shouldEnsureCrmPerson =
    scope === "EVENTPILOT:POINT_OF_SALE" || Boolean(cardMatchInfo?.attempted);

  if (!shouldEnsureCrmPerson) {
    return crmPersonId;
  }

  const { crmPerson, created } = await ensureCrmPersonForPaymentIntent({
    paymentIntent,
    eventId,
    stripeAccountId,
  });

  if (!crmPerson?.id) {
    return null;
  }

  if (created) {
    console.log(
      `[STRIPE][CRM] Created CRM person ${crmPerson.id} for PaymentIntent ${paymentIntent.id}`,
    );
  } else {
    console.log(
      `[STRIPE][CRM] Linked PaymentIntent ${paymentIntent.id} to CRM person ${crmPerson.id}`,
    );
  }

  return crmPerson.id;
};

const resolveRegistrationNetAmount = async ({
  paymentIntent,
  eventId,
  charge,
}) => {
  let netAmount = paymentIntent.amount / 100;

  try {
    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: { stripeConnectedAccountId: true },
    });

    const connectedAccount = eventRecord?.stripeConnectedAccountId || undefined;
    const balanceTransactionId =
      typeof charge?.balance_transaction === "string"
        ? charge.balance_transaction
        : (charge?.balance_transaction?.id ?? null);

    if (balanceTransactionId && connectedAccount) {
      const balanceTransaction = await stripe.balanceTransactions.retrieve(
        balanceTransactionId,
        {
          stripeAccount: connectedAccount,
        },
      );

      if (balanceTransaction && typeof balanceTransaction.net === "number") {
        netAmount = balanceTransaction.net / 100;
      }
    }
  } catch (error) {
    const baseTotal = parseFloat(paymentIntent.metadata?.baseTotal);

    if (!Number.isNaN(baseTotal) && baseTotal >= 0) {
      netAmount = baseTotal;
    } else {
      console.warn(
        "[STRIPE] Failed to retrieve balance transaction for net amount; falling back to gross",
        error,
      );
    }
  }

  return netAmount;
};

const handleRegistrationPaymentIntent = async ({
  paymentIntent,
  eventId,
  registrationId,
  instanceId,
}) => {
  const charge = paymentIntent?.charges?.data?.[0] ?? null;
  const receiptUrl = charge?.receipt_url;
  const netAmount = await resolveRegistrationNetAmount({
    paymentIntent,
    eventId,
    charge,
  });

  const instance = await prisma.eventInstance.findFirst({
    where: { id: instanceId, eventId },
    select: { id: true },
  });

  if (!instance) {
    console.warn(
      `[STRIPE] PaymentIntent ${paymentIntent.id} references unknown instance ${instanceId}; skipping registration ledger item`,
    );
    return;
  }

  const { crmPersonId } = await finalizeRegistration({
    registrationId,
    eventId,
    receiptUrl,
    paymentIntent,
    instanceId,
  });

  await createLedgerItemForRegistration({
    eventId,
    instanceId: instance.id,
    registrationId,
    amount: netAmount,
    stripe_paymentIntentId: paymentIntent.id,
    crmPersonId,
  });
};

const handlePointOfSalePaymentIntent = async ({
  paymentIntent,
  eventId,
  instanceId,
  crmPersonId,
  stripeAccountId,
  dayOfDashboardAccountId,
}) => {
  if (!eventId || !instanceId) {
    console.warn(
      `[STRIPE] PaymentIntent ${paymentIntent.id} missing event or instance metadata; skipping POS ledger item`,
    );
    return;
  }

  if (!crmPersonId) {
    console.warn(
      `[STRIPE] PaymentIntent ${paymentIntent.id} succeeded without a CRM person; skipping POS ledger item`,
    );
    return;
  }

  const instance = await prisma.eventInstance.findFirst({
    where: { id: instanceId, eventId },
    select: { id: true },
  });

  if (!instance) {
    console.warn(
      `[STRIPE] PaymentIntent ${paymentIntent.id} references unknown instance ${instanceId}; skipping POS ledger item`,
    );
    return;
  }

  await ensurePointOfSaleLedgerForPaymentIntent({
    paymentIntent,
    eventId,
    instanceId: instance.id,
    crmPersonId,
    stripeAccountId,
    dayOfDashboardAccountId,
  });
};

export const handlePaymentIntentSucceededWebhook = async ({
  stripeEvent,
  webhookReceiptLogId,
}) => {
  const paymentIntent = stripeEvent.data.object;
  const metadata = paymentIntent.metadata || {};
  const scope = metadata.scope || null;

  const affiliations = await resolveStripeAffiliations(paymentIntent);
  let finalCrmPersonId = affiliations.crmPersonId ?? null;
  const finalEventId = metadata.eventId || affiliations.eventId || null;
  const stripeAccountId = affiliations.stripeAccountId || null;

  logCardMatchAttempt({
    paymentIntent,
    eventId: finalEventId,
    crmPersonId: finalCrmPersonId,
    cardMatchInfo: affiliations.cardMatchInfo,
  });

  try {
    finalCrmPersonId = await ensurePaymentIntentCrmPerson({
      paymentIntent,
      eventId: finalEventId,
      crmPersonId: finalCrmPersonId,
      stripeAccountId,
      scope,
      cardMatchInfo: affiliations.cardMatchInfo,
    });
  } catch (error) {
    console.error(
      `[STRIPE][CRM] Failed to ensure CRM person for PaymentIntent ${paymentIntent.id}`,
      error,
    );
  }

  const paymentIntentLog = await ensureStripeLog({
    type: LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
    objectId: paymentIntent.id,
    data: paymentIntent,
    eventId: finalEventId,
    crmPersonId: finalCrmPersonId,
  });

  await syncStripeLogAssociations({
    logIds: [webhookReceiptLogId, paymentIntentLog.id],
    eventId: finalEventId,
    crmPersonId: finalCrmPersonId,
  });

  if (scope === "EVENTPILOT:REGISTRATION") {
    await handleRegistrationPaymentIntent({
      paymentIntent,
      eventId: finalEventId,
      registrationId: metadata.registrationId,
      instanceId: metadata.instanceId,
    });
    return;
  }

  if (scope === "EVENTPILOT:POINT_OF_SALE") {
    await handlePointOfSalePaymentIntent({
      paymentIntent,
      eventId: finalEventId,
      instanceId: metadata.instanceId || null,
      crmPersonId: finalCrmPersonId,
      stripeAccountId,
      dayOfDashboardAccountId:
        typeof metadata.dayOfAccountId === "string"
          ? metadata.dayOfAccountId
          : null,
    });
    return;
  }

  console.warn(
    `[STRIPE] PaymentIntent ${paymentIntent.id} succeeded with unsupported scope ${scope || "undefined"}`,
  );
};
