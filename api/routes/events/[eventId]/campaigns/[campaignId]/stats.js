import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { EmailStatus } from "@prisma/client";
import { reportApiError } from "#util/reportApiError.js";

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

      const aggregates = grouped.reduce(
        (acc, entry) => {
          const count = entry._count._all;
          acc.total += count;
          acc.byStatus[entry.status] = count;
          return acc;
        },
        { total: 0, byStatus: {} }
      );

      const deliveredCount =
        (aggregates.byStatus[EmailStatus.DELIVERED] || 0) +
        (aggregates.byStatus[EmailStatus.OPENED] || 0) +
        (aggregates.byStatus[EmailStatus.UNSUBSCRIBED] || 0);
      const openedCount = aggregates.byStatus[EmailStatus.OPENED] || 0;
      const unsubscribedCount =
        aggregates.byStatus[EmailStatus.UNSUBSCRIBED] || 0;
      const bouncedCount = aggregates.byStatus[EmailStatus.BOUNCED] || 0;

      return res.json({
        stats: {
          total: aggregates.total,
          deliveredCount,
          openedCount,
          unsubscribedCount,
          bouncedCount,
          deliveredPercent: roundPercent(deliveredCount, aggregates.total),
          openedPercent: roundPercent(openedCount, aggregates.total),
          unsubscribedPercent: roundPercent(
            unsubscribedCount,
            aggregates.total
          ),
          bouncedPercent: roundPercent(bouncedCount, aggregates.total),
        },
      });
    } catch (error) {
      console.error(
        `Failed to load stats for campaign ${campaignId} on event ${eventId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to load campaign stats" });
    }
  },
];
