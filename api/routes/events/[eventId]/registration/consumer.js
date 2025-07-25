import { prisma } from "#prisma";

export const get = [
  async (req, res) => {
    const now = new Date();
    const { eventId } = req.params;

    let tiers = await prisma.registrationTier.findMany({
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

    tiers = tiers.map((t) => {
      const tier = t.pricingTiers[0];
      const disabled = tier === undefined || tier.available === false;
      return {
        ...t,
        period: disabled
          ? null
          : {
              ...tier,
              ...tier.registrationPeriod,
              registrationPeriod: undefined,
            },
        pricingTiers: undefined,
        disabled,
      };
    });

    res.json({ tiers, fields: [] });
  },
];
