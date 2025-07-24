import { prisma } from "#prisma";

export const get = [
  async (req, res) => {
    const now = new Date();
    const { eventId } = req.params;

    const tiers = await prisma.registrationTier.findMany({
      where: { eventId },
      include: {
        pricingTiers: {
          where: {
            registrationPeriod: {
              startTime: {
                lte: now,
              },
              endTime: {
                gte: now,
              },
            },
          },
          include: {
            registrationPeriod: {
              select: {
                endTime: true,
                endTimeTz: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({ tiers, fields: [] });
  },
];
