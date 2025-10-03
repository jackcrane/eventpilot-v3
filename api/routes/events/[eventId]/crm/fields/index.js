import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";

export const fieldSchema = z.object({
  label: z.string().min(2).max(50),
  description: z.string().optional().nullable(),
  type: z.enum(["TEXT", "EMAIL", "PHONE", "BOOLEAN", "DATE", "NUMBER"]),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const crmFields = await prisma.crmField.findMany({
      where: {
        eventId,
        deleted: req.query.includeDeleted ? undefined : false,
      },
    });

    if (!crmFields) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      crmFields,
    });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    try {
      const result = fieldSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }

      const crmField = await prisma.crmField.create({
        data: {
          ...result.data,
          eventId,
          logs: {
            create: {
              type: LogType.CRM_FIELD_CREATED,
              userId: req.user.id,
              ip: req.ip || req.headers["x-forwarded-for"],
              data: result.data,
              eventId,
            },
          },
        },
      });

      res.json({
        crmField,
      });
    } catch (error) {
      console.error("Error in POST /event/:eventId/crm:", error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
