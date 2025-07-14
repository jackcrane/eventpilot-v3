import { prisma } from "#prisma";
import { extractAllEmails } from "./helpers";

export const processCrmPersonRelationships = async (
  body,
  eventId,
  inboundEmailId
) => {
  const emailObjs = extractAllEmails(body);
  const distinctEmails = Array.from(
    new Set(emailObjs.map((e) => e.Email.toLowerCase()))
  );

  const existingEmailRecs = await prisma.crmPersonEmail.findMany({
    where: {
      email: { in: distinctEmails, mode: "insensitive" },
      crmPerson: {
        eventId,
      },
    },
    include: { crmPerson: true },
  });
  const matchedPersonIds = Array.from(
    new Set(existingEmailRecs.map((r) => r.crmPersonId))
  );

  for (const personId of matchedPersonIds) {
    await prisma.crmPerson.update({
      where: { id: personId },
      data: {
        inboundEmails: { connect: { id: inboundEmailId } },
        logs: {
          create: {
            type: "EMAIL_WEBHOOK_RECEIVED",
            eventId,
            data: JSON.stringify(body),
            inboundEmailId,
          },
        },
      },
    });
  }

  const matchedEmailSet = new Set(
    existingEmailRecs.map((r) => r.email.toLowerCase())
  );
  const newEmailObjs = emailObjs.filter(
    (e) => !matchedEmailSet.has(e.Email.toLowerCase())
  );

  console.log("New emails", newEmailObjs);
  console.log("matched emails", matchedEmailSet);

  for (const { Email, Name } of newEmailObjs) {
    console.log("New emails", newEmailObjs.length);
    const personName = Name?.trim() || Email;
    await prisma.crmPerson.create({
      data: {
        name: personName,
        source: "EMAIL",
        event: { connect: { id: eventId } },
        emails: { create: { email: Email } },
        inboundEmails: { connect: { id: inboundEmailId } },
        logs: {
          createMany: {
            data: [
              { type: "CRM_PERSON_CREATED", eventId },
              {
                type: "EMAIL_WEBHOOK_RECEIVED",
                eventId,
                inboundEmailId,
                data: JSON.stringify(body),
              },
            ],
          },
        },
      },
    });
  }
};
