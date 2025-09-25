import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { zerialize } from "zodex";

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    templateId: z.string().cuid(),
    mailingListId: z.string().cuid(),
    sendImmediately: z.boolean().optional().default(false),
    sendAt: z.string().datetime().nullish(),
    sendAtTz: z.string().trim().min(1).nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.sendImmediately) {
      return;
    }

    if (!data.sendAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Send time is required when not sending immediately.",
        path: ["sendAt"],
      });
    }

    if (!data.sendAtTz) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Timezone is required when scheduling a send.",
        path: ["sendAtTz"],
      });
    }
  });

export const baseCampaignSelect = {
  id: true,
  name: true,
  eventId: true,
  templateId: true,
  mailingListId: true,
  sendImmediately: true,
  sendAt: true,
  sendAtTz: true,
  createdAt: true,
  updatedAt: true,
  template: {
    select: {
      id: true,
      name: true,
      deleted: true,
    },
  },
  mailingList: {
    select: {
      id: true,
      title: true,
      deleted: true,
    },
  },
};

export const formatCampaign = (campaign) => ({
  ...campaign,
  template: campaign.template
    ? {
        id: campaign.template.id,
        name: campaign.template.name,
        deleted: campaign.template.deleted,
      }
    : null,
  mailingList: campaign.mailingList
    ? {
        id: campaign.mailingList.id,
        title: campaign.mailingList.title,
        deleted: campaign.mailingList.deleted,
      }
    : null,
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    try {
      const campaigns = await prisma.campaign.findMany({
        where: { eventId },
        select: baseCampaignSelect,
        orderBy: { createdAt: "desc" },
      });

      return res.json({ campaigns: campaigns.map((c) => formatCampaign(c)) });
    } catch (error) {
      console.error(`Error fetching campaigns for event ${eventId}:`, error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const result = campaignSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const {
      name,
      templateId,
      mailingListId,
      sendImmediately = false,
      sendAt,
      sendAtTz,
    } = result.data;

    try {
      const [template, mailingList] = await Promise.all([
        prisma.emailTemplate.findFirst({
          where: { id: templateId, eventId, deleted: false },
          select: { id: true },
        }),
        prisma.mailingList.findFirst({
          where: { id: mailingListId, eventId, deleted: false },
          select: { id: true },
        }),
      ]);

      if (!template) {
        return res
          .status(400)
          .json({ message: "Template not found for this event." });
      }

      if (!mailingList) {
        return res
          .status(400)
          .json({ message: "Mailing list not found for this event." });
      }

      const scheduledSend = sendImmediately ? null : sendAt;
      const scheduledTz = sendImmediately ? null : sendAtTz;

      if (scheduledSend && Number.isNaN(new Date(scheduledSend).getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid send time provided." });
      }

      const created = await prisma.campaign.create({
        data: {
          name,
          templateId,
          mailingListId,
          eventId,
          sendImmediately,
          sendAt: scheduledSend ? new Date(scheduledSend) : null,
          sendAtTz: scheduledTz ?? null,
        },
        select: baseCampaignSelect,
      });

      return res.status(201).json({ campaign: formatCampaign(created) });
    } catch (error) {
      console.error(`Error creating campaign for event ${eventId}:`, error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(campaignSchema));
  },
];
