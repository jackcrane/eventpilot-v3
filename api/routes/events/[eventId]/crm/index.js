import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

export const collapseCrmValues = (arr) => {
  return Object.fromEntries(
    arr.map(({ crmFieldId, value }) => [crmFieldId, value])
  );
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    try {
      const crmFields = await prisma.crmField.findMany({
        where: {
          eventId,
        },
      });

      let crmPersons = await prisma.crmPerson.findMany({
        where: {
          eventId,
          deleted: req.query.includeDeleted ? undefined : false,
        },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
        },
      });

      crmPersons = crmPersons.map((person) => ({
        ...person,
        fields: collapseCrmValues(person.fieldValues),
      }));

      res.json({
        crmFields,
        crmPersons,
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
