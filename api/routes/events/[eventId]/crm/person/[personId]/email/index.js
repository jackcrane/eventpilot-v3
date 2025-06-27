import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { emailSchema } from "./[emailId]";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { personId } = req.params;
    const crmPersonEmails = await prisma.crmPersonEmail.findMany({
      where: {
        crmPersonId: personId,
        deleted: req.query.includeDeleted || false,
      },
    });

    if (!crmPersonEmails) {
      return res.status(404).json({ message: "Person not found" });
    }

    res.json({
      crmPersonEmails,
    });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { personId } = req.params;
    const result = emailSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
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

    const crmPersonEmail = await prisma.crmPersonEmail.create({
      data: {
        ...result.data,
        crmPersonId: personId,
      },
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
