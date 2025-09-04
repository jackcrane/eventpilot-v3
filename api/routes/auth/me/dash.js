import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { isCustomerInGoodStanding } from "#stripe";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const events = await prisma.event.findMany({
      where: {
        userId: req.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        emailVerified: true,
      },
    });

    const emailVerified = Boolean(user?.emailVerified);
    const goodPaymentStanding = false; // User-level standing deprecated

    return res.json({
      steps: {
        eventCount: events.length > 0,
        emailVerified,
        goodPaymentStanding,
      },
    });
  },
];
