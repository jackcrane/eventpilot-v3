import RegistrationConfirmationEmail from "#emails/registration-confirmation.jsx";
import { sendEmail } from "#postmark";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { getNameAndEmailFromRegistration } from "./getNameAndEmailFromRegistration";
import { render } from "@react-email/render";
import { getCrmPersonByEmail } from "./getCrmPersonByEmail";
import { createLedgerItemForRegistration } from "./ledger";

export const finalizeRegistration = async ({
  registrationId,
  eventId,
  receiptUrl,
  paymentIntent,
  // Optional: if provided (and there is no paymentIntent), we will create a ledger item
  amount,
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

  // If there was no Stripe paymentIntent involved and a positive amount was provided,
  // create a ledger item to reflect the charge (e.g., admin/manual or free-flow edge cases).
  // Stripe webhook path already creates the ledger item before calling finalizeRegistration.
  if (!paymentIntent && amount && amount > 0 && instanceId) {
    await createLedgerItemForRegistration({
      eventId,
      instanceId,
      registrationId,
      amount,
    });
  }

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
    eventId
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
      },
    });
  } else {
    await prisma.crmPerson.create({
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
        logs: {
          create: {
            type: LogType.CRM_PERSON_CREATED,
            eventId,
            registrationId: registration.id,
          },
        },
      },
    });
  }
};
