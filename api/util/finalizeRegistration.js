import RegistrationConfirmationEmail from "#emails/registration-confirmation.jsx";
import { sendEmail } from "#postmark";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { getNameAndEmailFromRegistration } from "./getNameAndEmailFromRegistration";
import { render } from "@react-email/render";
import { getCrmPersonByEmail } from "./getCrmPersonByEmail";

export const finalizeRegistration = async ({
  registrationId,
  eventId,
  receiptUrl,
  paymentIntent,
  // Optional: if provided (and there is no paymentIntent), we will create a ledger item
  // amount,
  instanceId,
}) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      logo: true,
      banner: true,
    },
  });

  const registration = await prisma.registration.update({
    where: {
      id: registrationId,
    },
    data: {
      finalized: true,
    },
  });

  // Defer ledger creation to callers so we can guarantee crmPerson linkage

  await prisma.logs.create({
    data: {
      type: LogType.REGISTRATION_CONFIRMED,
      data: {
        registration,
        paymentIntent,
      },
      eventId,
      registrationId,
    },
  });

  const { name, email } = await getNameAndEmailFromRegistration(
    registrationId,
    eventId,
    instanceId
  );

  await sendEmail({
    From: `${event.name} <registration-confirmation@geteventpilot.com>`,
    To: email,
    Subject: `Thanks for registering for ${event.name}!`,
    HtmlBody: await render(
      RegistrationConfirmationEmail.RegistrationConfirmationEmail({
        name,
        event,
        logoImage: event.logo?.location,
        bannerImage: event.banner?.location,
        receiptUrl,
      })
    ),
    TextBody: `Thanks for registering for ${event.name}!`,
  });

  const crmPerson = await getCrmPersonByEmail(email, eventId);
  let crmPersonId = null;
  const stripeCustomerId =
    paymentIntent && typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : null;

  if (crmPerson) {
    await prisma.crmPerson.update({
      where: {
        id: crmPerson.id,
      },
      data: {
        registrations: {
          connect: {
            id: registration.id,
          },
        },
        // Persist Stripe customer ID when available (and not already set)
        ...(stripeCustomerId && !crmPerson.stripe_customerId
          ? { stripe_customerId: stripeCustomerId }
          : {}),
      },
    });
    crmPersonId = crmPerson.id;
  } else {
    const created = await prisma.crmPerson.create({
      data: {
        name,
        source: "REGISTRATION",
        emails: {
          create: {
            email,
          },
        },
        eventId,
        registrations: {
          connect: {
            id: registration.id,
          },
        },
        ...(stripeCustomerId ? { stripe_customerId: stripeCustomerId } : {}),
        logs: {
          create: {
            type: LogType.CRM_PERSON_CREATED,
            eventId,
            registrationId: registration.id,
          },
        },
      },
      select: { id: true },
    });
    crmPersonId = created?.id || null;
  }
  return { crmPersonId };
};
