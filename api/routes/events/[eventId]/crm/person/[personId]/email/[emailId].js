import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";

export const emailSchema = z.object({
  email: z.string().email(),
  label: z.string().default(""),
  notes: z.string().optional().nullable(),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { emailId } = req.params;
    const email = await prisma.crmPersonEmail.findUnique({
      where: {
        id: emailId,
      },
    });

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    res.json({
      crmPersonEmail: email,
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { personId, emailId } = req.params;
    const email = await prisma.crmPersonEmail.findUnique({
      where: {
        id: emailId,
      },
    });

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const before = await prisma.crmPerson.findUnique({
      where: {
        id: personId,
      },
      include: {
        emails: { where: { deleted: req.query.includeDeleted ? true : false } },
        phones: true,
        fieldValues: true,
      },
    });

    if (!before || before.deleted) {
      return res.status(404).json({ message: "Person not found" });
    }

    const result = emailSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const crmPersonEmail = await prisma.crmPersonEmail.update({
      where: {
        id: emailId,
      },
      data: result.data,
    });

    const after = await prisma.crmPerson.findUnique({
      where: {
        id: personId,
      },
      include: {
        emails: { where: { deleted: req.query.includeDeleted ? true : false } },
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
          after: after,
        },
        eventId: before.eventId,
      },
    });

    res.json({
      crmPersonEmail,
    });
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { emailId } = req.params;
    const email = await prisma.crmPersonEmail.findUnique({
      where: {
        id: emailId,
      },
    });

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const before = await prisma.crmPerson.findUnique({
      where: {
        id: email.crmPersonId,
      },
      include: {
        emails: { where: { deleted: req.query.includeDeleted ? true : false } },
        phones: true,
        fieldValues: true,
      },
    });

    if (!before || before.deleted) {
      return res.status(404).json({ message: "Person not found" });
    }

    const crmPersonEmail = await prisma.crmPersonEmail.update({
      where: {
        id: emailId,
      },
      data: {
        deleted: true,
      },
    });

    const after = await prisma.crmPerson.findUnique({
      where: {
        id: email.crmPersonId,
      },
      include: {
        emails: { where: { deleted: req.query.includeDeleted ? true : false } },
        phones: true,
        fieldValues: true,
      },
    });

    await prisma.logs.create({
      data: {
        type: LogType.CRM_PERSON_MODIFIED,
        crmPersonId: email.crmPersonId,
        userId: req.user.id,
        ip: req.ip || req.headers["x-forwarded-for"],
        data: {
          before: before,
          after: after,
        },
        eventId: before.eventId,
      },
    });

    res.json({
      crmPersonEmail,
    });
  },
];
