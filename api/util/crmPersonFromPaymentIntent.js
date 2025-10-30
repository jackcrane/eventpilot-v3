import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { LogType } from "@prisma/client";
import { getCrmPersonByEmail } from "#util/getCrmPersonByEmail.js";

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

const ensurePaymentIntentMetadata = async (paymentIntent, stripeAccountId, crmPersonId) => {
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

  const metadataPersonId = normalizeString(paymentIntent?.metadata?.crmPersonId);
  const byMetadata = await loadCrmPersonById(metadataPersonId);
  if (byMetadata) {
    await ensurePaymentIntentMetadata(paymentIntent, stripeAccountId, byMetadata.id);
    return { crmPerson: byMetadata, created: false };
  }

  const {
    name: derivedName,
    email: derivedEmail,
  } =
    deriveContactDetails(paymentIntent);

  const normalizedEmailRaw = normalizeString(derivedEmail);
  const normalizedEmail = normalizedEmailRaw ? normalizedEmailRaw.toLowerCase() : null;

  if (normalizedEmail) {
    const byEmail = await getCrmPersonByEmail(normalizedEmail, eventId);
    if (byEmail) {
      await ensurePaymentIntentMetadata(paymentIntent, stripeAccountId, byEmail.id);
      return { crmPerson: byEmail, created: false };
    }
  }

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
    const existing = await loadCrmPersonById(priorCreationLog.crmPersonId);
    if (existing) {
      await ensurePaymentIntentMetadata(paymentIntent, stripeAccountId, existing.id);
      return { crmPerson: existing, created: false };
    }
  }

  const normalizedDerivedName = normalizeString(derivedName);
  const resolvedName = normalizedDerivedName
    ? normalizedDerivedName.slice(0, MAX_NAME_LENGTH)
    : null;

  if (!resolvedName) {
    throw new Error("Unable to determine cardholder name from payment intent");
  }

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

  await ensurePaymentIntentMetadata(paymentIntent, stripeAccountId, created.id);

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
