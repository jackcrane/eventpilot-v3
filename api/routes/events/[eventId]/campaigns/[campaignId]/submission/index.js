import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { formatFormResponse } from "./[submissionId]";
import { LogType } from "@prisma/client";

const bodySchema = z.object({
  values: z.record(z.string(), z.string()),
  pii: z.record(z.string(), z.any()).optional(),
});

export const post = async (req, res) => {
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: serializeError(parseResult) });
  }
  const { values, pii } = parseResult.data;
  const { campaignId } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: { slug: campaignId },
  });

  try {
    const formResponse = await prisma.formResponse.create({
      data: {
        campaign: { connect: { slug: campaignId } },
        fieldResponses: {
          create: Object.entries(values).map(([fieldId, value]) => ({
            field: { connect: { id: fieldId } },
            value,
          })),
        },
        pii: {
          create: {
            ...pii,
            userAgent: req.headers["user-agent"],
            ipAddress:
              req.headers["x-forwarded-for"] || req.connection.remoteAddress,
          },
        },
      },
    });

    await prisma.logs.create({
      data: {
        type: LogType.FORM_RESPONSE_CREATED,
        userId: req.user.id,
        ip: req.ip,
        eventId: campaign.eventId,
        campaignId: campaign.id,
        formResponseId: formResponse.id,
        data: formResponse,
      },
    });

    res.json({ id: formResponse.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { campaignId } = req.params;
    try {
      const fields = await prisma.formField.findMany({
        where: { campaignId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          options: { select: { id: true, label: true, deleted: true } },
          deleted: true,
        },
      });

      const rawResponses = await prisma.formResponse.findMany({
        where: { campaignId },
        include: {
          fieldResponses: { select: { fieldId: true, value: true } },
        },
      });

      const responses = rawResponses.map((resp) =>
        formatFormResponse(resp, fields)
      );

      const fieldsMeta = fields.map((f) => ({
        ...f,
        currentlyInForm: !f.deleted,
      }));

      return res.json({
        fields: fieldsMeta,
        responses,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];
