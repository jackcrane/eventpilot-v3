import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";
import { reportApiError } from "#util/reportApiError.js";
import { createLogBuffer } from "../../../../util/logging.js";

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

const formatTemplate = (template) => ({
  ...template,
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const includeDeleted = !!req.query.includeDeleted;

    try {
      throw new Error("Test error");
      const templates = await prisma.emailTemplate.findMany({
        where: {
          eventId,
          deleted: includeDeleted ? undefined : false,
        },
        select: baseTemplateSelect,
        orderBy: { createdAt: "desc" },
      });

      const response = templates.map((template) => formatTemplate(template));

      return res.json({ templates: response });
    } catch (error) {
      // console.error(`Error fetching templates for event ${eventId}:`, error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    const result = templateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { name, textBody } = result.data;

    try {
      const logBuffer = createLogBuffer();

      const template = await prisma.$transaction(async (tx) => {
        const created = await tx.emailTemplate.create({
          data: {
            name,
            textBody: textBody ?? "",
            eventId,
          },
          select: baseTemplateSelect,
        });

        logBuffer.push({
          type: LogType.EMAIL_TEMPLATE_CREATED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          emailTemplateId: created.id,
          data: { after: created },
        });

        return created;
      });

      await logBuffer.flush();

      return res.status(201).json({ template: formatTemplate(template) });
    } catch (error) {
      console.error(`Error creating template for event ${eventId}:`, error);

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

export const query = [
  (req, res) => {
    return res.json(zerialize(templateSchema));
  },
];
