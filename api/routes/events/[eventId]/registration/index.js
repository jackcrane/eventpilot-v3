import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { NameAndEmailFromRegistrationFactory } from "../../../../util/getNameAndEmailFromRegistration";

export const arrayToObject = (arr) =>
  arr.reduce((acc, cur) => Object.assign(acc, cur), {});

const flattenResponse = (response) => {
  return {
    [response.fieldId]: response.value,
  };
};

export const getOrderedFields = async (eventId) => {
  const fields = await prisma.registrationField.findMany({
    where: {
      eventId,
      deleted: false,
      page: { deleted: false },
      type: {
        notIn: ["UPSELLS", "REGISTRATIONTIER", "RICHTEXT"],
      },
    },
  });

  const priority = { participantName: 0, participantEmail: 1 };

  return fields.sort((a, b) => {
    const aRank = priority[a.fieldType] ?? 2;
    const bRank = priority[b.fieldType] ?? 2;
    return aRank - bRank;
  });
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    let registrations = await prisma.registration.findMany({
      where: { eventId, instanceId: req.instanceId, deleted: false },
      include: {
        registrationTier: true,
        upsells: true,
        fieldResponses: true,
      },
    });

    const factory = await NameAndEmailFromRegistrationFactory.prepare(eventId);

    registrations = registrations.map((r) => {
      const { name, email } = factory.getNameAndEmail(r);
      const flatResponses = arrayToObject(
        r.fieldResponses.map(flattenResponse)
      );
      return {
        flat: {
          name,
          email,
        },
        responses: flatResponses,
        ...r,
      };
    });

    const fields = await getOrderedFields(eventId);

    res.json({ registrations, fields });
  },
];
