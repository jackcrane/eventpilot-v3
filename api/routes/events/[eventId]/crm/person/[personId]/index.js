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
        id: z.string().optional().nullable(),
        email: z.string().email(),
        label: z.string().default(""),
        notes: z.string().optional().nullable(),
      })
    )
    .default([]),
  phones: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
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
          inboundEmails: true,
          phones: true,
          fieldValues: true,
          logs: {
            orderBy: { createdAt: "desc" },
          },
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
  verifyAuth([`manager`]),
  async (req, res) => {
    const { eventId, personId } = req.params;

    try {
      // 1) validate payload
      const result = personSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }

      // 2) pull out nested arrays and the rest of the person data
      const {
        fields: incomingFields = [],
        emails: incomingEmails = [],
        phones: incomingPhones = [],
        ...personData
      } = result.data;

      // 3) load existing person + relations
      const before = await prisma.crmPerson.findUnique({
        where: { id: personId },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
        },
      });
      if (!before || before.deleted) {
        return res.status(404).json({ message: `Person not found` });
      }

      // 4) diff emails
      const emailCreates = incomingEmails
        .filter((e) => !e.id)
        .map(({ label, email }) => ({ label, email }));
      const emailUpdates = incomingEmails
        .filter((e) => e.id)
        .map(({ id, label, email }) => ({
          where: { id },
          data: { label, email },
        }));
      const emailIdsToDelete = before.emails
        .map((e) => e.id)
        .filter((id) => !incomingEmails.some((e) => e.id === id));

      // 5) diff phones
      const phoneCreates = incomingPhones
        .filter((p) => !p.id)
        .map(({ label, phone }) => ({ label, phone }));
      const phoneUpdates = incomingPhones
        .filter((p) => p.id)
        .map(({ id, label, phone }) => ({
          where: { id },
          data: { label, phone },
        }));
      const phoneIdsToDelete = before.phones
        .map((p) => p.id)
        .filter((id) => !incomingPhones.some((p) => p.id === id));

      // 6) build upsert payload for fieldValues
      const fieldUpserts = incomingFields.map((f) => ({
        where: {
          // composite unique: person + field
          crmPersonId_crmFieldId: {
            crmPersonId: personId,
            crmFieldId: f.id,
          },
        },
        update: { value: f.value },
        create: { crmFieldId: f.id, value: f.value },
      }));

      // 7) apply update with nested create/update/delete/upsert
      const crmPerson = await prisma.crmPerson.update({
        where: { id: personId },
        data: {
          ...personData,
          emails: {
            create: emailCreates,
            update: emailUpdates,
            deleteMany: emailIdsToDelete.length
              ? { id: { in: emailIdsToDelete } }
              : undefined,
          },
          phones: {
            create: phoneCreates,
            update: phoneUpdates,
            deleteMany: phoneIdsToDelete.length
              ? { id: { in: phoneIdsToDelete } }
              : undefined,
          },
          fieldValues: {
            upsert: fieldUpserts,
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

      // 8) log the diff
      await prisma.logs.create({
        data: {
          type: LogType.CRM_PERSON_MODIFIED,
          crmPersonId: personId,
          userId: req.user.id,
          ip: req.ip || req.headers["x-forwarded-for"],
          data: { before, after: crmPerson },
          eventId,
        },
      });

      // 9) re-fetch full record and return
      const personToReturn = await prisma.crmPerson.findUnique({
        where: { id: personId },
        include: {
          emails: {
            where: { deleted: req.query.includeDeleted ? undefined : false },
          },
          phones: true,
          fieldValues: true,
          logs: true,
        },
      });

      return res.json({
        crmPerson: {
          ...personToReturn,
          fields: collapseCrmValues(personToReturn.fieldValues),
        },
      });
    } catch (error) {
      console.error(`Error in PUT /event/${eventId}/crm/${personId}:`, error);
      return res.status(500).json({ error: `Internal server error` });
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
