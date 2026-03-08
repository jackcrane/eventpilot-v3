import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { getCrmPersonByEmail } from "../../../util/getCrmPersonByEmail.js";
import {
  findCrmPersonByStoredPaymentMethod,
  resolvePaymentMethodDetails,
} from "../../../util/paymentMethods.js";

const CARD_LOG_TYPES = [
  LogType.STRIPE_PAYMENT_METHOD_ATTACHED,
  LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
];

const numberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildJsonPathFilters = (paths, value) =>
  paths.map((path) => ({
    data: {
      path,
      equals: value,
    },
  }));

const extractCardMatchContext = (paymentIntent) => {
  if (!paymentIntent || paymentIntent.object !== "payment_intent") {
    return null;
  }

  const paymentMethodId =
    typeof paymentIntent.payment_method === "string"
      ? paymentIntent.payment_method
      : typeof paymentIntent?.charges?.data?.[0]?.payment_method === "string"
      ? paymentIntent.charges.data[0].payment_method
      : null;

  const charges = Array.isArray(paymentIntent?.charges?.data)
    ? paymentIntent.charges.data
    : [];

  const capturedCharge =
    charges.find((charge) => charge?.captured) ?? charges[0] ?? null;

  const paymentDetails = capturedCharge?.payment_method_details ?? {};
  const cardDetails =
    paymentDetails?.card_present ||
    paymentDetails?.card ||
    capturedCharge?.payment_method_details?.card ||
    null;

  return {
    stripePaymentMethodId: paymentMethodId,
    fingerprint: cardDetails?.fingerprint || null,
    brand: cardDetails?.brand || null,
    last4: cardDetails?.last4 || null,
    expMonth: numberOrNull(cardDetails?.exp_month ?? cardDetails?.expMonth),
    expYear: numberOrNull(cardDetails?.exp_year ?? cardDetails?.expYear),
    nameOnCard:
      cardDetails?.cardholder_name ||
      cardDetails?.cardholderName ||
      capturedCharge?.billing_details?.name ||
      null,
  };
};

const hasSearchablePaymentMethodDetails = (details) =>
  Boolean(
    details?.stripePaymentMethodId ||
      details?.fingerprint ||
      (details?.brand &&
        details?.last4 &&
        details?.expMonth != null &&
        details?.expYear != null)
  );

const findCrmPersonFromPriorLogs = async ({
  eventId,
  paymentMethodId,
  fingerprint,
  brand,
  last4,
  expMonth,
  expYear,
}) => {
  const baseWhere = {
    eventId,
    crmPersonId: { not: null },
  };

  if (paymentMethodId) {
    const [paymentMethodLog, priorIntentLog] = await Promise.all([
      prisma.logs.findFirst({
        where: {
          ...baseWhere,
          type: LogType.STRIPE_PAYMENT_METHOD_ATTACHED,
          data: { path: ["id"], equals: paymentMethodId },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.logs.findFirst({
        where: {
          ...baseWhere,
          type: LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
          data: { path: ["payment_method"], equals: paymentMethodId },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const crmPersonId =
      paymentMethodLog?.crmPersonId || priorIntentLog?.crmPersonId || null;

    if (crmPersonId) {
      return { crmPersonId, matchType: "payment_method_id" };
    }
  }

  if (fingerprint) {
    const fingerprintLog = await prisma.logs.findFirst({
      where: {
        ...baseWhere,
        type: { in: CARD_LOG_TYPES },
        OR: buildJsonPathFilters(
          [
            ["card_present", "fingerprint"],
            ["card", "fingerprint"],
            [
              "charges",
              "data",
              "0",
              "payment_method_details",
              "card_present",
              "fingerprint",
            ],
            [
              "charges",
              "data",
              "0",
              "payment_method_details",
              "card",
              "fingerprint",
            ],
          ],
          fingerprint
        ),
      },
      orderBy: { createdAt: "desc" },
    });

    if (fingerprintLog?.crmPersonId) {
      return {
        crmPersonId: fingerprintLog.crmPersonId,
        matchType: "card_fingerprint",
      };
    }
  }

  if (!(brand && last4 && expMonth != null && expYear != null)) {
    return null;
  }

  const cardDetailsLog = await prisma.logs.findFirst({
    where: {
      ...baseWhere,
      type: { in: CARD_LOG_TYPES },
      AND: [
        {
          OR: buildJsonPathFilters(
            [
              ["card_present", "brand"],
              ["card", "brand"],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card_present",
                "brand",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card",
                "brand",
              ],
            ],
            brand
          ),
        },
        {
          OR: buildJsonPathFilters(
            [
              ["card_present", "last4"],
              ["card", "last4"],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card_present",
                "last4",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card",
                "last4",
              ],
            ],
            last4
          ),
        },
        {
          OR: buildJsonPathFilters(
            [
              ["card_present", "exp_month"],
              ["card_present", "expMonth"],
              ["card", "exp_month"],
              ["card", "expMonth"],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card_present",
                "exp_month",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card_present",
                "expMonth",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card",
                "exp_month",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card",
                "expMonth",
              ],
            ],
            expMonth
          ),
        },
        {
          OR: buildJsonPathFilters(
            [
              ["card_present", "exp_year"],
              ["card_present", "expYear"],
              ["card", "exp_year"],
              ["card", "expYear"],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card_present",
                "exp_year",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card_present",
                "expYear",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card",
                "exp_year",
              ],
              [
                "charges",
                "data",
                "0",
                "payment_method_details",
                "card",
                "expYear",
              ],
            ],
            expYear
          ),
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!cardDetailsLog?.crmPersonId) {
    return null;
  }

  return {
    crmPersonId: cardDetailsLog.crmPersonId,
    matchType: "card_brand_last4_exp",
  };
};

const findCrmPersonFromPayment = async ({ eventId, paymentMethodDetails }) => {
  if (!eventId || !hasSearchablePaymentMethodDetails(paymentMethodDetails)) {
    return null;
  }

  const storedMatch = await findCrmPersonByStoredPaymentMethod({
    eventId,
    paymentMethodDetails,
  });

  if (storedMatch?.crmPersonId) {
    return storedMatch;
  }

  return findCrmPersonFromPriorLogs({
    eventId,
    paymentMethodId: paymentMethodDetails.stripePaymentMethodId,
    fingerprint: paymentMethodDetails.fingerprint,
    brand: paymentMethodDetails.brand,
    last4: paymentMethodDetails.last4,
    expMonth: paymentMethodDetails.expMonth,
    expYear: paymentMethodDetails.expYear,
  });
};

const resolveEventContext = async (stripeObject) => {
  let eventId = stripeObject?.metadata?.eventId || null;

  if (!eventId) {
    const subscriptionId =
      typeof stripeObject?.subscription === "string"
        ? stripeObject.subscription
        : null;

    if (subscriptionId) {
      const eventRecord = await prisma.event.findFirst({
        where: { stripe_subscriptionId: subscriptionId },
        select: { id: true, stripeConnectedAccountId: true },
      });

      if (eventRecord) {
        return {
          eventId: eventRecord.id,
          stripeAccountId: eventRecord.stripeConnectedAccountId?.trim() || null,
        };
      }
    }
  }

  if (!eventId) {
    const customerId =
      typeof stripeObject?.customer === "string" ? stripeObject.customer : null;

    if (customerId) {
      const eventRecord = await prisma.event.findFirst({
        where: { stripe_customerId: customerId },
        select: { id: true, stripeConnectedAccountId: true },
      });

      if (eventRecord) {
        return {
          eventId: eventRecord.id,
          stripeAccountId: eventRecord.stripeConnectedAccountId?.trim() || null,
        };
      }
    }
  }

  if (!eventId) {
    return { eventId: null, stripeAccountId: null };
  }

  const eventRecord = await prisma.event.findUnique({
    where: { id: eventId },
    select: { stripeConnectedAccountId: true },
  });

  return {
    eventId,
    stripeAccountId: eventRecord?.stripeConnectedAccountId?.trim() || null,
  };
};

export const resolveStripeAffiliations = async (stripeObject) => {
  try {
    const { eventId, stripeAccountId } = await resolveEventContext(stripeObject);
    let crmPersonId = stripeObject?.metadata?.crmPersonId || null;
    let cardMatchInfo = null;

    if (!crmPersonId) {
      const customerId =
        typeof stripeObject?.customer === "string" ? stripeObject.customer : null;

      if (customerId) {
        const person = await prisma.crmPerson.findFirst({
          where: { stripe_customerId: customerId },
          select: { id: true },
        });
        crmPersonId = person?.id || null;
      }
    }

    if (!crmPersonId && eventId) {
      const email =
        stripeObject?.charges?.data?.[0]?.billing_details?.email ||
        stripeObject?.billing_details?.email ||
        null;

      if (email) {
        const person = await getCrmPersonByEmail(email, eventId);
        crmPersonId = person?.id || null;
      }
    }

    if (!crmPersonId && stripeObject?.object === "payment_intent" && eventId) {
      const paymentMethodDetails = await resolvePaymentMethodDetails({
        paymentIntent: stripeObject,
        stripeAccountId,
        initialDetails: extractCardMatchContext(stripeObject),
      });

      if (
        stripeObject?.status === "succeeded" &&
        hasSearchablePaymentMethodDetails(paymentMethodDetails)
      ) {
        const matched = await findCrmPersonFromPayment({
          eventId,
          paymentMethodDetails,
        });

        cardMatchInfo = {
          attempted: true,
          matched: Boolean(matched?.crmPersonId),
          matchType: matched?.matchType ?? null,
          context: {
            paymentMethodId: paymentMethodDetails.stripePaymentMethodId,
            fingerprint: paymentMethodDetails.fingerprint,
            brand: paymentMethodDetails.brand,
            last4: paymentMethodDetails.last4,
            expMonth: paymentMethodDetails.expMonth,
            expYear: paymentMethodDetails.expYear,
            cardholderName: paymentMethodDetails.nameOnCard,
          },
        };

        if (matched?.crmPersonId) {
          crmPersonId = matched.crmPersonId;
        }
      }
    }

    return { eventId, crmPersonId, cardMatchInfo, stripeAccountId };
  } catch (error) {
    console.warn("[STRIPE] resolveAffiliations error", error);
    return {
      eventId: null,
      crmPersonId: null,
      cardMatchInfo: null,
      stripeAccountId: null,
    };
  }
};
