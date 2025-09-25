import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { dispatchCampaign } from "#util/campaignDispatch";
import {
  baseCampaignSelect,
  campaignSchema,
  formatCampaign,
} from "../index.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;

    try {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, eventId },
        select: baseCampaignSelect,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      return res.json({ campaign: formatCampaign(campaign) });
    } catch (error) {
      console.error(
        `Error fetching campaign ${campaignId} for event ${eventId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

const validateSchedule = ({ sendImmediately, sendAt }) => {
  if (!sendImmediately && sendAt) {
    return Number.isNaN(new Date(sendAt).getTime());
  }
  return false;
};

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;
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

    if (validateSchedule({ sendImmediately, sendAt })) {
      return res.status(400).json({ message: "Invalid send time provided." });
    }

    try {
      const existing = await prisma.campaign.findFirst({
        where: { id: campaignId, eventId },
        select: { id: true, sendEffortStarted: true, sendImmediately: true },
      });

      if (!existing) {
        return res.status(404).json({ message: "Campaign not found" });
      }

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

      const now = new Date();
      const scheduledSend = sendImmediately ? now : sendAt;
      const scheduledTz = sendImmediately ? null : sendAtTz;

      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          name,
          templateId,
          mailingListId,
          sendImmediately,
          sendAt: scheduledSend ? new Date(scheduledSend) : null,
          sendAtTz: scheduledTz ?? null,
        },
        select: baseCampaignSelect,
      });

      if (sendImmediately && !existing.sendEffortStarted) {
        dispatchCampaign({
          campaignId,
          initiatedByUserId: req.user.id,
          reqId: req.id,
        }).catch((err) => {
          console.error(
            `[${req.id}] Failed to dispatch updated campaign ${campaignId}:`,
            err
          );
        });
      }

      return res.json({ campaign: formatCampaign(updated) });
    } catch (error) {
      console.error(`Error updating campaign ${campaignId} for event ${eventId}:`, error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;

    try {
      const result = await prisma.campaign.deleteMany({
        where: { id: campaignId, eventId },
      });

      if (result.count === 0) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error(`Error deleting campaign ${campaignId} for event ${eventId}:`, error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
