import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";
import { personSchema } from "./person/[personId]";
import { diffObjects } from "../../../../util/diffObjects";

export const collapseCrmValues = (arr) => {
  return Object.fromEntries(arr.map(({ id, value }) => [id, value]));
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
