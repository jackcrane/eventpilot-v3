import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { EmailStatus } from "@prisma/client";

const roundPercent = (count, total) => {
  if (!total || total <= 0) return 0;
  return Number(((count / total) * 100).toFixed(1));
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;

    try {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, eventId },
        select: { id: true },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const grouped = await prisma.email.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: { _all: true },
      });

      const totals = grouped.reduce(
        (acc, entry) => {
          const count = entry._count._all;
          acc.total += count;

          if (entry.status === EmailStatus.OPENED) {
            acc.opened += count;
            acc.delivered += count;
          } else if (entry.status === EmailStatus.DELIVERED) {
            acc.delivered += count;
          } else if (entry.status === EmailStatus.BOUNCED) {
            acc.bounced += count;
          }

          return acc;
        },
        { total: 0, delivered: 0, opened: 0, bounced: 0 }
      );

      return res.json({
        stats: {
          total: totals.total,
          deliveredCount: totals.delivered,
          openedCount: totals.opened,
          bouncedCount: totals.bounced,
          deliveredPercent: roundPercent(totals.delivered, totals.total),
          openedPercent: roundPercent(totals.opened, totals.total),
          bouncedPercent: roundPercent(totals.bounced, totals.total),
        },
      });
    } catch (error) {
      console.error(
        `Failed to load stats for campaign ${campaignId} on event ${eventId}:`,
        error
      );
      return res.status(500).json({ message: "Failed to load campaign stats" });
    }
  },
];
