import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";
import { collapseCrmValues } from "../..";
import { diffObjects } from "../../../../../../util/diffObjects";

export const personSchema = z.object({
  name: z.string().min(2).max(50),
  fields: z
    .array(
      z.object({
        id: z.string(), // id
        value: z.string(),
      })
    )
    .default([]),
  emails: z
    .array(
      z.object({
        email: z.string().email(),
        label: z.string().default(""),
        notes: z.string().optional().nullable(),
      })
    )
    .default([]),
  phones: z
    .array(
      z.object({
        phone: z.string(),
        label: z.string().default(""),
        notes: z.string().optional().nullable(),
      })
    )
    .default([]),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const personId = req.params.personId;

    try {
      const crmPerson = await prisma.crmPerson.findUnique({
        where: {
          id: personId,
          deleted: req.query.includeDeleted ? undefined : false,
        },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
          logs: true,
        },
      });

      if (!crmPerson) {
        return res.status(404).json({ message: "Person not found" });
      }

      res.json({
        crmPerson: {
          ...crmPerson,
          fields: collapseCrmValues(crmPerson.fieldValues),
          logs: crmPerson.logs.map((log) => diffObjects(log)),
        },
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm/:personId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const personId = req.params.personId;

    try {
      const result = personSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }

      let fields = result.data.fields;
      delete result.data.fields;

      const before = await prisma.crmPerson.findUnique({
        where: {
          id: personId,
        },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
        },
      });

      if (!before || before.deleted) {
        return res.status(404).json({ message: "Person not found" });
      }

      const crmPerson = await prisma.crmPerson.update({
        where: {
          id: personId,
        },
        data: {
          ...result.data,
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
        },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
        },
      });

      await prisma.logs.create({
        data: {
          type: LogType.CRM_PERSON_MODIFIED,
          crmPersonId: personId,
          userId: req.user.id,
          ip: req.ip || req.headers["x-forwarded-for"],
          data: {
            before: before,
            after: crmPerson,
          },
          eventId,
        },
      });

      const personToReturn = await prisma.crmPerson.findUnique({
        where: {
          id: personId,
        },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
          logs: true,
        },
      });

      res.json({
        crmPerson: {
          ...personToReturn,
          fields: collapseCrmValues(personToReturn.fieldValues),
        },
      });
    } catch (error) {
      console.error("Error in PUT /event/:eventId/crm/:personId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const personId = req.params.personId;

    try {
      const crmPerson = await prisma.crmPerson.update({
        where: {
          id: personId,
        },
        data: {
          deleted: true,
          logs: {
            create: {
              type: LogType.CRM_PERSON_DELETED,
              userId: req.user.id,
              ip: req.ip || req.headers["x-forwarded-for"],
              data: null,
              eventId,
            },
          },
        },
      });

      res.json({
        crmPerson,
      });
    } catch (error) {
      console.error("Error in DELETE /event/:eventId/crm/:personId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
