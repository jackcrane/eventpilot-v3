import { prisma } from "#prisma";

export const getNameAndEmailFromRegistration = async (
  registrationId,
  eventId
) => {
  const fields = await prisma.registrationField.findMany({
    where: {
      eventId,
      deleted: false,
      fieldType: {
        in: ["participantName", "participantEmail"],
      },
      page: {
        deleted: false,
      },
    },
  });

  const nameFieldId = fields.find((f) => f.fieldType === "participantName")?.id;
  const emailFieldId = fields.find(
    (f) => f.fieldType === "participantEmail"
  )?.id;

  const responses = await prisma.registrationFieldResponse.findMany({
    where: {
      registrationId,
      fieldId: {
        in: fields.map((f) => f.id),
      },
    },
  });

  const name = responses.find((r) => r.fieldId === nameFieldId)?.value;
  const email = responses.find((r) => r.fieldId === emailFieldId)?.value;

  return { name, email };
};

export class NameAndEmailFromRegistrationFactory {
  constructor(nameFieldId, emailFieldId) {
    this.nameFieldId = nameFieldId;
    this.emailFieldId = emailFieldId;
  }

  // load the two field-IDs once per event
  static prepare = async (eventId) => {
    const fields = await prisma.registrationField.findMany({
      where: {
        eventId,
        deleted: false,
        fieldType: { in: ["participantName", "participantEmail"] },
        page: { deleted: false },
      },
      select: { id: true, fieldType: true },
    });

    const nameFieldId = fields.find(
      (f) => f.fieldType === "participantName"
    )?.id;
    const emailFieldId = fields.find(
      (f) => f.fieldType === "participantEmail"
    )?.id;

    return new NameAndEmailFromRegistrationFactory(nameFieldId, emailFieldId);
  };

  // synchronous: just inspects registration.fieldResponses
  getNameAndEmail = (registration) => {
    const { fieldResponses = [] } = registration;

    const name = fieldResponses.find(
      (r) => r.fieldId === this.nameFieldId
    )?.value;
    const email = fieldResponses.find(
      (r) => r.fieldId === this.emailFieldId
    )?.value;

    return { name, email };
  };

  getFields = () => {
    return { nameFieldId: this.nameFieldId, emailFieldId: this.emailFieldId };
  };
}
