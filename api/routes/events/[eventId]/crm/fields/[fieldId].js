import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";
import { fieldSchema } from "./index";
import { diffObjects } from "../../../../../util/diffObjects";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const fieldId = req.params.fieldId;
    const crmField = await prisma.crmField.findUnique({
      where: {
        id: fieldId,
        deleted: req.query.includeDeleted ? undefined : false,
      },
      include: {
        logs: true,
      },
    });

    if (!crmField) {
      return res.status(404).json({ message: "Field not found" });
    }

    res.json({
      crmField: {
        ...crmField,
        logs: crmField.logs.map((log) => diffObjects(log)),
      },
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const fieldId = req.params.fieldId;

    try {
      const result = fieldSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }

      const before = await prisma.crmField.findUnique({
        where: {
          id: fieldId,
        },
      });

      if (!before || before.deleted) {
        return res.status(404).json({ message: "Field not found" });
      }

      const crmField = await prisma.crmField.update({
        where: {
          id: fieldId,
        },
        data: {
          ...result.data,
        },
      });

      await prisma.logs.create({
        data: {
          type: LogType.CRM_FIELD_MODIFIED,
          crmFieldId: fieldId,
          userId: req.user.id,
          ip: req.ip || req.headers["x-forwarded-for"],
          data: {
            before: before,
            after: crmField,
          },
          eventId,
        },
      });

      res.json({
        crmField,
      });
    } catch (error) {
      console.error("Error in PUT /event/:eventId/crm/:fieldId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const fieldId = req.params.fieldId;
    const before = await prisma.crmField.findUnique({
      where: {
        id: fieldId,
      },
    });

    if (!before || before.deleted) {
      return res.status(404).json({ message: "Field not found" });
    }

    const crmField = await prisma.crmField.update({
      where: {
        id: fieldId,
      },
      data: {
        deleted: true,
      },
    });

    await prisma.logs.create({
      data: {
        type: LogType.CRM_FIELD_DELETED,
        crmFieldId: fieldId,
        userId: req.user.id,
        ip: req.ip || req.headers["x-forwarded-for"],
        data: {
          before,
          after: crmField,
        },
        eventId: crmField.eventId,
      },
    });

    res.json({
      crmField,
    });
  },
];
