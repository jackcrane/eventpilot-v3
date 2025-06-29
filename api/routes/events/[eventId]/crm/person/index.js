import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { collapseCrmValues } from "..";
import { serializeError } from "#serializeError";
import { personSchema } from "./[personId]";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    try {
      const crmPersons = await prisma.crmPerson.findMany({
        where: {
          eventId,
          deleted: req.query.includeDeleted || false,
        },
        include: {
          emails: true,
          phones: true,
          fieldValues: true,
        },
      });

      if (!crmPersons) {
        return res.status(404).json({ message: "Person not found" });
      }

      res.json({
        crmPersons: crmPersons.map((person) => ({
          ...person,
          fields: collapseCrmValues(person.fieldValues),
        })),
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm/:personId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

// Create a new CRM person
export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    try {
      const result = personSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }

      let fields = result.data.fields;
      delete result.data.fields;

      const crmPerson = await prisma.crmPerson.create({
        data: {
          ...result.data,
          eventId,
          emails: {
            create: result.data.emails,
          },
          phones: {
            create: result.data.phones,
          },
          fieldValues: {
            create: fields.map((field) => ({
              crmFieldId: field.id,
              value: field.value,
            })),
          },
          logs: {
            create: {
              type: LogType.CRM_PERSON_CREATED,
              userId: req.user.id,
              ip: req.ip || req.headers["x-forwarded-for"],
              data: result.data,
              eventId,
            },
          },
        },
      });

      res.json({
        crmPerson,
      });
    } catch (error) {
      console.error("Error in POST /event/:eventId/crm:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
