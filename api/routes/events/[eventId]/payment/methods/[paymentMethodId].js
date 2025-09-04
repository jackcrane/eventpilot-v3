import { verifyAuth } from "#verifyAuth";
import { stripe } from "#stripe";
import { prisma } from "#prisma";

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const evt = await prisma.event.findFirst({
      where: { id: req.params.eventId, userId: req.user.id },
      select: { stripe_customerId: true },
    });
    if (!evt?.stripe_customerId) {
      return res.status(400).json({ message: "Stripe customer not found" });
    }

    const pmId = req.params.paymentMethodId;
    try {
      const pm = await stripe.paymentMethods.retrieve(pmId);
      if (pm?.customer !== evt.stripe_customerId) {
        return res.status(400).json({ message: "Payment method not owned by event" });
      }
      await stripe.paymentMethods.detach(pmId);
      return res.status(200).json({ message: "Detached" });
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Failed to detach" });
    }
  },
];

