import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const campaign = await prisma.campaign.findFirst({
      where: {
        userId: req.user.id,
        AND: [
          {
            OR: [
              { slug: req.params.campaignId },
              { id: req.params.campaignId },
            ],
          },
          {
            OR: [
              { eventId: req.params.eventId },
              { event: { slug: req.params.eventId } },
            ],
          },
        ],
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    if (!req.user.id) {
      delete campaign.userId;
    }

    res.json({
      campaign,
    });
  },
];
