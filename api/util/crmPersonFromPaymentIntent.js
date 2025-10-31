import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { LogType } from "@prisma/client";
import { getCrmPersonByEmail } from "#util/getCrmPersonByEmail.js";
import {
  ensurePaymentMethodForCrmPerson,
  resolvePaymentMethodDetails,
  findCrmPersonByStoredPaymentMethod,
} from "./paymentMethods.js";

const TAP_TO_PAY_EMAIL_LABEL = "Tap to Pay";
const MAX_NAME_LENGTH = 160;

const firstValue = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const deriveContactDetails = (paymentIntent) => {
  if (!paymentIntent) {
    return { name: null, email: null };
  }

  const metadata = paymentIntent?.metadata || {};

  const charges = Array.isArray(paymentIntent?.charges?.data)
    ? paymentIntent.charges.data
    : [];

  const capturedCharge =
    charges.find((charge) => charge?.captured) ?? charges[0] ?? null;

  const billingDetails = capturedCharge?.billing_details ?? {};
  const shippingDetails =
    capturedCharge?.shipping ||
    paymentIntent?.shipping ||
    paymentIntent?.shipping_address_collection ||
    {};
  const paymentDetails = capturedCharge?.payment_method_details ?? {};
  const cardDetails =
    paymentDetails?.card_present ||
    paymentDetails?.card ||
    capturedCharge?.payment_method_details?.card ||
    null;

  const cardholderName = firstValue(
    metadata?.crmPersonName,
    metadata?.customerName,
    metadata?.name,
    metadata?.fullName,
    metadata?.cardholderName,
    cardDetails?.cardholder_name,
    cardDetails?.cardholderName,
    billingDetails?.name,
    shippingDetails?.name
  );

  const email = firstValue(
    metadata?.crmPersonEmail,
    metadata?.customerEmail,
    metadata?.email,
    billingDetails?.email,
    paymentIntent?.customer_email,
    paymentIntent?.receipt_email
  );

  return {
    name: cardholderName,
    email,
  };
};

const loadCrmPersonById = async (id) => {
  if (!id) {
    return null;
  }
  const person = await prisma.crmPerson.findFirst({
    where: { id, deleted: false },
    include: {
      emails: {
        where: { deleted: false },
      },
    },
  });
  return person;
};

const ensurePaymentIntentMetadata = async (
  paymentIntent,
  stripeAccountId,
  crmPersonId
) => {
  if (!paymentIntent || !stripeAccountId || !crmPersonId) {
    return;
  }
  const currentId = normalizeString(paymentIntent?.metadata?.crmPersonId);
  if (currentId === crmPersonId) {
    return;
  }

  const metadata = {
    ...(paymentIntent?.metadata || {}),
    crmPersonId,
  };

  await stripe.paymentIntents.update(
    paymentIntent.id,
    { metadata },
    { stripeAccount: stripeAccountId }
  );
};

export const ensureCrmPersonForPaymentIntent = async ({
  paymentIntent,
  eventId,
  stripeAccountId,
  dayOfDashboardAccountId = null,
}) => {
  if (!paymentIntent || !eventId) {
    return { crmPerson: null, created: false };
  }

  const logMatchStep = (step, data = {}, matched = false) => {
    const context = {
      paymentIntentId: paymentIntent?.id,
      eventId,
      matched,
      ...data,
    };
    const message = `[CRM][PaymentIntent] ${matched ? "Matched" : "Trying"} via ${step}`;
    console.info(message, context);
  };

  const paymentMethodDetails = await resolvePaymentMethodDetails({
    paymentIntent,
    stripeAccountId,
  });
  const metadataPersonId = normalizeString(
    paymentIntent?.metadata?.crmPersonId
  );
  logMatchStep("metadata", { metadataPersonId, result: "attempt" });
  const byMetadata = await loadCrmPersonById(metadataPersonId);
  if (byMetadata) {
    logMatchStep(
      "metadata",
      { metadataPersonId, crmPersonId: byMetadata.id, result: "matched" },
      true
    );
    await ensurePaymentIntentMetadata(
      paymentIntent,
      stripeAccountId,
      byMetadata.id
    );
    await ensurePaymentMethodForCrmPerson({
      crmPersonId: byMetadata.id,
      paymentMethodDetails,
      paymentIntent,
      stripeAccountId,
    });
    return { crmPerson: byMetadata, created: false };
  }
  logMatchStep("metadata", { metadataPersonId, result: "no_match" });

  logMatchStep("stored_payment_method", {
    stripePaymentMethodId: paymentMethodDetails?.stripePaymentMethodId,
    fingerprint: paymentMethodDetails?.fingerprint,
    brand: paymentMethodDetails?.brand,
    last4: paymentMethodDetails?.last4,
    expMonth: paymentMethodDetails?.expMonth ?? null,
    expYear: paymentMethodDetails?.expYear ?? null,
    nameOnCard: paymentMethodDetails?.nameOnCard ?? null,
    result: "attempt",
  });
  const viaPaymentMethod = await findCrmPersonByStoredPaymentMethod({
    eventId,
    paymentMethodDetails,
  });

  if (viaPaymentMethod?.crmPersonId) {
    logMatchStep(
      "stored_payment_method",
      {
        stripePaymentMethodId: paymentMethodDetails?.stripePaymentMethodId,
        fingerprint: paymentMethodDetails?.fingerprint,
        brand: paymentMethodDetails?.brand,
        last4: paymentMethodDetails?.last4,
        expMonth: paymentMethodDetails?.expMonth ?? null,
        expYear: paymentMethodDetails?.expYear ?? null,
        nameOnCard: paymentMethodDetails?.nameOnCard ?? null,
        matchType: viaPaymentMethod.matchType,
        crmPersonId: viaPaymentMethod.crmPersonId,
        result: "matched",
      },
      true
    );
    const matchedPerson = await loadCrmPersonById(viaPaymentMethod.crmPersonId);
    if (matchedPerson) {
      await ensurePaymentIntentMetadata(
        paymentIntent,
        stripeAccountId,
        matchedPerson.id
      );
      await ensurePaymentMethodForCrmPerson({
        crmPersonId: matchedPerson.id,
        paymentMethodDetails,
        paymentIntent,
        stripeAccountId,
      });
      return { crmPerson: matchedPerson, created: false };
    }
  }
  logMatchStep(
    "stored_payment_method",
    {
      stripePaymentMethodId: paymentMethodDetails?.stripePaymentMethodId,
      fingerprint: paymentMethodDetails?.fingerprint,
      brand: paymentMethodDetails?.brand,
      last4: paymentMethodDetails?.last4,
      expMonth: paymentMethodDetails?.expMonth ?? null,
      expYear: paymentMethodDetails?.expYear ?? null,
      nameOnCard: paymentMethodDetails?.nameOnCard ?? null,
      result: "no_match",
    },
    false
  );

  const { name: derivedName, email: derivedEmail } =
    deriveContactDetails(paymentIntent);

  const normalizedEmailRaw = normalizeString(derivedEmail);
  const normalizedEmail = normalizedEmailRaw
    ? normalizedEmailRaw.toLowerCase()
    : null;

  if (normalizedEmail) {
    logMatchStep("email", { email: normalizedEmail, result: "attempt" });
    const byEmail = await getCrmPersonByEmail(normalizedEmail, eventId);
    if (byEmail) {
      logMatchStep(
        "email",
        { email: normalizedEmail, crmPersonId: byEmail.id, result: "matched" },
        true
      );
      await ensurePaymentIntentMetadata(
        paymentIntent,
        stripeAccountId,
        byEmail.id
      );
      await ensurePaymentMethodForCrmPerson({
        crmPersonId: byEmail.id,
        paymentMethodDetails,
        paymentIntent,
        stripeAccountId,
      });
      return { crmPerson: byEmail, created: false };
    }
    logMatchStep("email", { email: normalizedEmail, result: "no_match" });
  }

  logMatchStep("prior_creation_log", {
    paymentIntentId: paymentIntent.id,
    result: "attempt",
  });
  const priorCreationLog = await prisma.logs.findFirst({
    where: {
      type: LogType.CRM_PERSON_CREATED,
      eventId,
      data: {
        path: ["paymentIntentId"],
        equals: paymentIntent.id,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (priorCreationLog?.crmPersonId) {
    logMatchStep(
      "prior_creation_log",
      { crmPersonId: priorCreationLog.crmPersonId, result: "matched" },
      true
    );
    const existing = await loadCrmPersonById(priorCreationLog.crmPersonId);
    if (existing) {
      await ensurePaymentIntentMetadata(
        paymentIntent,
        stripeAccountId,
        existing.id
      );
      await ensurePaymentMethodForCrmPerson({
        crmPersonId: existing.id,
        paymentMethodDetails,
        paymentIntent,
        stripeAccountId,
      });
      return { crmPerson: existing, created: false };
    }
  }
  logMatchStep(
    "prior_creation_log",
    { paymentIntentId: paymentIntent.id, result: "no_match" },
    false
  );

  const normalizedName = normalizeString(derivedName);
  const resolvedName = normalizedName
    ? normalizedName.slice(0, MAX_NAME_LENGTH)
    : "";

  const created = await prisma.crmPerson.create({
    data: {
      eventId,
      name: resolvedName,
      source: "POINT_OF_SALE",
      emails: normalizedEmail
        ? {
            create: [
              {
                email: normalizedEmail,
                label: TAP_TO_PAY_EMAIL_LABEL,
              },
            ],
          }
        : undefined,
    },
    include: {
      emails: {
        where: { deleted: false },
      },
    },
  });

  await prisma.logs.create({
    data: {
      type: LogType.CRM_PERSON_CREATED,
      crmPersonId: created.id,
      eventId,
      dayOfDashboardAccountId: dayOfDashboardAccountId ?? undefined,
      data: {
        origin: "DAY_OF_POINT_OF_SALE",
        paymentIntentId: paymentIntent.id,
      },
    },
  });

  logMatchStep(
    "created_new_person",
    {
      crmPersonId: created.id,
      resolvedName: resolvedName || null,
      stripePaymentMethodId: paymentMethodDetails?.stripePaymentMethodId,
      fingerprint: paymentMethodDetails?.fingerprint,
      brand: paymentMethodDetails?.brand,
      last4: paymentMethodDetails?.last4,
      expMonth: paymentMethodDetails?.expMonth ?? null,
      expYear: paymentMethodDetails?.expYear ?? null,
      nameOnCard: paymentMethodDetails?.nameOnCard ?? null,
      result: "created",
    },
    true
  );

  await ensurePaymentIntentMetadata(paymentIntent, stripeAccountId, created.id);
  await ensurePaymentMethodForCrmPerson({
    crmPersonId: created.id,
    paymentMethodDetails,
    paymentIntent,
    stripeAccountId,
  });

  return { crmPerson: created, created: true };
};

export const formatCrmPersonSummary = (person) => {
  if (!person) {
    return null;
  }
  const primaryEmail =
    person.emails?.find((email) => !email.deleted)?.email ?? null;
  return {
    id: person.id,
    name: person.name,
    email: primaryEmail,
  };
};
