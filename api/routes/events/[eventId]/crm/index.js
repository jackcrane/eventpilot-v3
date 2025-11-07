import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { reportApiError } from "#util/reportApiError.js";

export const collapseCrmValues = (arr) => {
  return Object.fromEntries(
    arr.map(({ crmFieldId, value }) => [crmFieldId, value])
  );
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    const includePersonsRaw = req.query.includePersons;
    const includePersons =
      includePersonsRaw === "true" ||
      includePersonsRaw === "1" ||
      includePersonsRaw === "yes";

    try {
      const crmFields = await prisma.crmField.findMany({
        where: {
          eventId,
          deleted: req.query.includeDeleted ? undefined : false,
        },
      });

      let crmPersons;
      if (includePersons) {
        const persons = await prisma.crmPerson.findMany({
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

        crmPersons = persons.map((person) => ({
          ...person,
          fields: collapseCrmValues(person.fieldValues),
        }));
      }

      res.json({
        crmFields,
        ...(includePersons ? { crmPersons } : {}),
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm:", error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
