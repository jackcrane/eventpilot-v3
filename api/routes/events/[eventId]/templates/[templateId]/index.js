import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";
import { createLogBuffer } from "../../../../../util/logging.js";

const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  textBody: z.string().max(500000).optional(),
});

const baseTemplateSelect = {
  id: true,
  eventId: true,
  name: true,
  textBody: true,
  createdAt: true,
  updatedAt: true,
  deleted: true,
};

const templateSelection = {
  ...baseTemplateSelect,
};

const formatTemplate = (template) => ({
  ...template,
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

const findTemplate = async (eventId, templateId, options = {}) => {
  return prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      eventId,
    },
    ...options,
  });
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, templateId } = req.params;
    const includeDeleted = !!req.query.includeDeleted;

    try {
      const template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          eventId,
          deleted: includeDeleted ? undefined : false,
        },
        select: templateSelection,
      });

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      return res.json({ template: formatTemplate(template) });
    } catch (error) {
      console.error(
        `Error fetching template ${templateId} for event ${eventId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, templateId } = req.params;
    const result = templateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { name, textBody } = result.data;

    try {
      const before = await findTemplate(eventId, templateId, {
        select: templateSelection,
      });

      if (!before || before.deleted) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Only the data update here — no logging inside a transaction
      const after = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          name,
          textBody: textBody ?? "",
        },
        select: templateSelection,
      });

      prisma.logs
        .create({
          data: {
            type: LogType.EMAIL_TEMPLATE_MODIFIED,
            userId: req.user.id,
            ip: ipAddress(req),
            eventId,
            emailTemplateId: templateId,
            data: {
              before: formatTemplate(before),
              after: formatTemplate(after),
            },
          },
        })
        .catch((e) => {
          console.warn("[logs.create] non-blocking failure:", e?.message || e);
        });

      return res.json({ template: formatTemplate(after) });
    } catch (error) {
      console.error(
        `Error updating template ${templateId} for event ${eventId}:`,
        error
      );

      if (error?.code === "P2002") {
        return res
          .status(409)
          .json({ message: "A template with this name already exists." });
      }

      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, templateId } = req.params;

    try {
      const before = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          eventId,
          deleted: false,
        },
        select: templateSelection,
      });

      if (!before) {
        return res.status(404).json({ message: "Template not found" });
      }

      const logBuffer = createLogBuffer();

      await prisma.$transaction(async (tx) => {
        await tx.emailTemplate.update({
          where: { id: templateId },
          data: { deleted: true },
        });

        logBuffer.push({
          type: LogType.EMAIL_TEMPLATE_DELETED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          emailTemplateId: templateId,
          data: { before: formatTemplate(before) },
        });
      });

      await logBuffer.flush();

      return res.status(204).send();
    } catch (error) {
      console.error(
        `Error deleting template ${templateId} for event ${eventId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(templateSchema));
  },
];
