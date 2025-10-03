import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { dispatchCampaign } from "#util/campaignDispatch";

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, eventId },
      select: { id: true, sendEffortStarted: true },
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    try {
      if (!campaign.sendEffortStarted) {
        await prisma.campaign.updateMany({
          where: { id: campaignId, eventId, sendEffortStarted: false },
          data: {
            sendImmediately: true,
            sendAt: new Date(),
            sendAtTz: null,
          },
        });
      }

      const result = await dispatchCampaign({
        campaignId,
        initiatedByUserId: req.user.id,
        reqId: req.id,
      });

      return res.json({ result });
    } catch (error) {
      console.error(
        `[${req.id}] Failed to send campaign ${campaignId} for event ${eventId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to send campaign" });
    }
  },
];
