import { prisma } from "#prisma";
import { stripe } from "#stripe";

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toIntOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  const int = Math.trunc(num);
  return Number.isInteger(int) ? int : null;
};

const hasCompositeCardIdentity = ({
  brand,
  last4,
  expMonth,
  expYear,
  nameOnCard,
}) =>
  Boolean(
    normalizeString(brand) &&
      normalizeString(last4) &&
      typeof expMonth === "number" &&
      typeof expYear === "number" &&
      normalizeString(nameOnCard)
  );

const buildCardIdentityKey = ({
  brand,
  last4,
  expMonth,
  expYear,
  nameOnCard,
}) => {
  if (
    !hasCompositeCardIdentity({
      brand,
      last4,
      expMonth,
      expYear,
      nameOnCard,
    })
  ) {
    return null;
  }
  return [
    "card",
    normalizeString(brand)?.toLowerCase(),
    normalizeString(last4),
    expMonth,
    expYear,
    normalizeString(nameOnCard)?.toLowerCase(),
  ]
    .filter((segment) => segment !== null && segment !== undefined)
    .join(":");
};

const resolvePaymentMethodKey = ({
  stripePaymentMethodId,
  fingerprint,
  brand,
  last4,
  expMonth,
  expYear,
  nameOnCard,
}) => {
  if (stripePaymentMethodId) {
    return stripePaymentMethodId;
  }
  if (fingerprint) {
    return `fingerprint:${fingerprint}`;
  }
  const cardKey = buildCardIdentityKey({
    brand,
    last4,
    expMonth,
    expYear,
    nameOnCard,
  });
  if (cardKey) {
    return cardKey;
  }
  return null;
};

export const sanitizePaymentMethodDetails = (details = {}) => {
  const stripePaymentMethodId = normalizeString(details.stripePaymentMethodId);
  const fingerprint = normalizeString(details.fingerprint);
  const brand = normalizeString(details.brand);
  const last4 = normalizeString(details.last4);
  const expMonth = toIntOrNull(details.expMonth);
  const expYear = toIntOrNull(details.expYear);
  const nameOnCard = normalizeString(details.nameOnCard);

  return {
    stripePaymentMethodId,
    fingerprint,
    brand,
    last4,
    expMonth,
    expYear,
    nameOnCard,
  };
};

const mergePaymentMethodDetails = (target, incoming) => {
  if (!target) {
    throw new Error("mergePaymentMethodDetails target is required");
  }
  if (!incoming) {
    return false;
  }
  const sanitized = sanitizePaymentMethodDetails(incoming);
  let updated = false;
  for (const key of [
    "stripePaymentMethodId",
    "fingerprint",
    "brand",
    "last4",
    "expMonth",
    "expYear",
    "nameOnCard",
  ]) {
    const value = sanitized[key];
    if (
      value !== null &&
      value !== undefined &&
      (target[key] === null || target[key] === undefined)
    ) {
      target[key] = value;
      updated = true;
    }
  }
  return updated;
};

const pickFirst = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const extractPaymentMethodDetailsFromCharge = (charge) => {
  if (!charge || typeof charge !== "object") {
    return null;
  }

  const paymentMethodId =
    typeof charge.payment_method === "string"
      ? charge.payment_method
      : null;

  const paymentDetails = charge?.payment_method_details || {};
  const typedDetails =
    paymentDetails?.card_present ||
    paymentDetails?.card ||
    (paymentDetails?.type &&
    typeof paymentDetails[paymentDetails.type] === "object"
      ? paymentDetails[paymentDetails.type]
      : null);

  const nameOnCard = pickFirst(
    typedDetails?.cardholder_name,
    typedDetails?.cardholderName,
    charge?.billing_details?.name
  );

  return sanitizePaymentMethodDetails({
    stripePaymentMethodId: paymentMethodId,
    fingerprint: typedDetails?.fingerprint,
    brand: typedDetails?.brand,
    last4: typedDetails?.last4,
    expMonth: typedDetails?.exp_month ?? typedDetails?.expMonth ?? null,
    expYear: typedDetails?.exp_year ?? typedDetails?.expYear ?? null,
    nameOnCard,
  });
};

const collectChargeCandidates = (paymentIntent) => {
  const candidates = [];
  const latestCharge =
    paymentIntent?.latest_charge &&
    typeof paymentIntent.latest_charge === "object"
      ? paymentIntent.latest_charge
      : null;

  if (latestCharge) {
    candidates.push(latestCharge);
  }

  const chargesArray = Array.isArray(paymentIntent?.charges?.data)
    ? paymentIntent.charges.data
    : [];

  for (const charge of chargesArray) {
    if (!charge || typeof charge !== "object") {
      continue;
    }
    if (
      !candidates.some(
        (existing) =>
          existing?.id && charge.id && existing.id === charge.id
      )
    ) {
      candidates.push(charge);
    }
  }

  return candidates;
};

const rankChargesByRelevance = (charges) => {
  const captured = [];
  const uncaptured = [];
  for (const charge of charges) {
    if (!charge || typeof charge !== "object") {
      continue;
    }
    if (charge.captured) {
      captured.push(charge);
    } else {
      uncaptured.push(charge);
    }
  }
  return [...captured, ...uncaptured];
};

const shouldHydrateRemotely = (details) =>
  Boolean(details) &&
  (!details.fingerprint || !hasCompositeCardIdentity(details));

export const resolvePaymentMethodDetails = async ({
  paymentIntent,
  stripeAccountId = null,
  initialDetails = null,
}) => {
  let details = sanitizePaymentMethodDetails(initialDetails || {});

  if (!paymentIntent) {
    return details;
  }

  const topLevelPaymentMethodId =
    typeof paymentIntent?.payment_method === "string"
      ? paymentIntent.payment_method
      : null;

  mergePaymentMethodDetails(details, {
    stripePaymentMethodId: topLevelPaymentMethodId,
  });

  const chargeCandidates = rankChargesByRelevance(
    collectChargeCandidates(paymentIntent)
  );

  for (const charge of chargeCandidates) {
    mergePaymentMethodDetails(
      details,
      extractPaymentMethodDetailsFromCharge(charge)
    );

    if (details.fingerprint && hasCompositeCardIdentity(details)) {
      break;
    }
  }

  if (!details.nameOnCard) {
    const metadataName = pickFirst(
      paymentIntent?.metadata?.cardholderName,
      paymentIntent?.metadata?.crmPersonName,
      paymentIntent?.metadata?.customerName,
      paymentIntent?.metadata?.name,
      paymentIntent?.metadata?.fullName
    );
    if (metadataName) {
      mergePaymentMethodDetails(details, { nameOnCard: metadataName });
    }
  }

  if (
    stripeAccountId &&
    details.stripePaymentMethodId &&
    shouldHydrateRemotely(details)
  ) {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        details.stripePaymentMethodId,
        {
          stripeAccount: stripeAccountId,
        }
      );

      if (paymentMethod) {
        const variant =
          paymentMethod?.card_present ||
          paymentMethod?.card ||
          (paymentMethod?.type &&
          typeof paymentMethod[paymentMethod.type] === "object"
            ? paymentMethod[paymentMethod.type]
            : null);

        const billingName = paymentMethod?.billing_details?.name || null;

        mergePaymentMethodDetails(details, {
          fingerprint: variant?.fingerprint,
          brand: variant?.brand,
          last4: variant?.last4,
          expMonth: variant?.exp_month ?? variant?.expMonth ?? null,
          expYear: variant?.exp_year ?? variant?.expYear ?? null,
          nameOnCard: pickFirst(
            variant?.cardholder_name,
            variant?.cardholderName,
            billingName
          ),
        });
      }
    } catch (error) {
      console.warn(
        "[CRM][PaymentIntent] Unable to retrieve PaymentMethod for enrichment",
        {
          paymentMethodId: details.stripePaymentMethodId,
          stripeAccountId,
          error: error?.message || String(error),
        }
      );
    }
  }

  return sanitizePaymentMethodDetails(details);
};

export const findCrmPersonByStoredPaymentMethod = async ({
  eventId,
  paymentMethodDetails,
}) => {
  if (!eventId) {
    return null;
  }

  const {
    stripePaymentMethodId,
    fingerprint,
    brand,
    last4,
    expMonth,
    expYear,
    nameOnCard,
  } = sanitizePaymentMethodDetails(paymentMethodDetails);

  const baseWhere = {
    crmPerson: {
      eventId,
      deleted: false,
    },
  };

  if (stripePaymentMethodId) {
    const match = await prisma.paymentMethod.findFirst({
      where: {
        ...baseWhere,
        stripePaymentMethodId,
      },
      select: { crmPersonId: true },
    });
    if (match?.crmPersonId) {
      return { crmPersonId: match.crmPersonId, matchType: "payment_method_id" };
    }
  }

  if (fingerprint) {
    const match = await prisma.paymentMethod.findFirst({
      where: {
        ...baseWhere,
        fingerprint,
      },
      orderBy: { updatedAt: "desc" },
      select: { crmPersonId: true },
    });
    if (match?.crmPersonId) {
      return { crmPersonId: match.crmPersonId, matchType: "fingerprint" };
    }
  }

  if (
    hasCompositeCardIdentity({
      brand,
      last4,
      expMonth,
      expYear,
      nameOnCard,
    })
  ) {
    const match = await prisma.paymentMethod.findFirst({
      where: {
        ...baseWhere,
        brand: brand
          ? {
              equals: brand,
              mode: "insensitive",
            }
          : undefined,
        last4: last4 ?? undefined,
        expMonth: expMonth ?? undefined,
        expYear: expYear ?? undefined,
        nameOnCard: nameOnCard
          ? {
              equals: nameOnCard,
              mode: "insensitive",
            }
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
      select: { crmPersonId: true },
    });
    if (match?.crmPersonId) {
      return {
        crmPersonId: match.crmPersonId,
        matchType: "card_brand_last4_exp",
      };
    }
  }

  return null;
};

const upsertPaymentMethodForCrmPerson = async ({
  crmPersonId,
  paymentMethodDetails,
}) => {
  if (!crmPersonId || !paymentMethodDetails) {
    return;
  }

  const {
    stripePaymentMethodId,
    fingerprint,
    brand,
    last4,
    expMonth,
    expYear,
    nameOnCard,
  } = sanitizePaymentMethodDetails(paymentMethodDetails);

  if (
    !stripePaymentMethodId &&
    !fingerprint &&
    !hasCompositeCardIdentity({
      brand,
      last4,
      expMonth,
      expYear,
      nameOnCard,
    })
  ) {
    return;
  }

  const dataPayload = {
    ...(fingerprint ? { fingerprint } : {}),
    ...(brand ? { brand } : {}),
    ...(last4 ? { last4 } : {}),
    ...(typeof expMonth === "number" ? { expMonth } : {}),
    ...(typeof expYear === "number" ? { expYear } : {}),
    ...(nameOnCard ? { nameOnCard } : {}),
  };

  const existingByStripeId = stripePaymentMethodId
    ? await prisma.paymentMethod.findFirst({
        where: {
          crmPersonId,
          stripePaymentMethodId,
        },
      })
    : null;

  const existingByFingerprint =
    !existingByStripeId && fingerprint
      ? await prisma.paymentMethod.findFirst({
          where: {
            crmPersonId,
            fingerprint,
          },
          orderBy: { updatedAt: "desc" },
        })
      : null;

  const existingByCardIdentity =
    !existingByStripeId &&
    !existingByFingerprint &&
    hasCompositeCardIdentity({
      brand,
      last4,
      expMonth,
      expYear,
      nameOnCard,
    })
      ? await prisma.paymentMethod.findFirst({
          where: {
            crmPersonId,
            brand: brand
              ? {
                  equals: brand,
                  mode: "insensitive",
                }
              : undefined,
            last4: last4 ?? undefined,
            expMonth: expMonth ?? undefined,
            expYear: expYear ?? undefined,
            nameOnCard: nameOnCard
              ? {
                  equals: nameOnCard,
                  mode: "insensitive",
                }
              : undefined,
          },
          orderBy: { updatedAt: "desc" },
        })
      : null;

  const existing =
    existingByStripeId || existingByFingerprint || existingByCardIdentity;

  if (existing) {
    const updateData = {
      ...dataPayload,
    };
    if (
      stripePaymentMethodId &&
      existing.stripePaymentMethodId !== stripePaymentMethodId
    ) {
      updateData.stripePaymentMethodId = stripePaymentMethodId;
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.paymentMethod.update({
        where: { id: existing.id },
        data: updateData,
      });
    }
    return;
  }

  const resolvedKey = resolvePaymentMethodKey({
    stripePaymentMethodId,
    fingerprint,
    brand,
    last4,
    expMonth,
    expYear,
    nameOnCard,
  });

  if (!resolvedKey) {
    return;
  }

  await prisma.paymentMethod.create({
    data: {
      crmPersonId,
      stripePaymentMethodId: resolvedKey,
      ...dataPayload,
    },
  });
};

export async function ensurePaymentMethodForCrmPerson({
  crmPersonId,
  paymentIntent = null,
  paymentMethodDetails = null,
  stripeAccountId = null,
}) {
  if (!crmPersonId) {
    return;
  }
  let details = sanitizePaymentMethodDetails(paymentMethodDetails || {});

  if (paymentIntent) {
    details = await resolvePaymentMethodDetails({
      paymentIntent,
      stripeAccountId,
      initialDetails: details,
    });
  }

  if (
    !details.stripePaymentMethodId &&
    !details.fingerprint &&
    !hasCompositeCardIdentity(details)
  ) {
    return;
  }

  await upsertPaymentMethodForCrmPerson({
    crmPersonId,
    paymentMethodDetails: details,
  });
}
