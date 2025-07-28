import { prisma } from "#prisma";

export const getCrmPersonByEmail = async (email, eventId) => {
  const crmPerson = await prisma.crmPerson.findFirst({
    where: {
      eventId,
      deleted: false,
      emails: {
        some: {
          email,
        },
      },
    },
  });

  return crmPerson;
};
