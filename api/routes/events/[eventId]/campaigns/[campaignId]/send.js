import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

const campaignSendSelect = {
  id: true,
  name: true,
  eventId: true,
  template: {
    select: {
      id: true,
      name: true,
    },
  },
  mailingList: {
    select: {
      id: true,
      title: true,
    },
  },
};

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;

    try {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, eventId },
        select: campaignSendSelect,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const templateChunk = campaign.template
        ? `${campaign.template.name} (${campaign.template.id})`
        : "no template";
      const listChunk = campaign.mailingList
        ? `${campaign.mailingList.title} (${campaign.mailingList.id})`
        : "no mailing list";

      console.log(
        `[Campaign Send] Event ${eventId} - Campaign ${campaign.id} (${campaign.name}) using ${templateChunk} targeting ${listChunk}`
      );

      return res.json({
        campaign,
        message: "Campaign send simulated. Check server logs for details.",
      });
    } catch (error) {
      console.error(
        `Error simulating campaign send for ${campaignId} on event ${eventId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
