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
