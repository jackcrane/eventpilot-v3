import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const campaign = await prisma.campaign.findFirst({
      where: {
        userId: req.user.id,
        id: req.params.campaignId,
      },
    });

    res.json({
      campaign,
    });
  },
];
