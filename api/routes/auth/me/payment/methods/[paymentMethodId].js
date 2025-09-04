import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";

// DELETE /api/auth/me/payment/methods/:paymentMethodId
export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { paymentMethodId } = req.params;
    if (!paymentMethodId) {
      return res.status(400).json({ message: "Missing payment method id" });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripe_customerId: true },
    });

    if (!me?.stripe_customerId) {
      return res.status(400).json({ message: "Stripe customer not found" });
    }

    const customer = await stripe.customers.retrieve(me.stripe_customerId);
    const defaultPm = customer?.invoice_settings?.default_payment_method;
    if (defaultPm && defaultPm === paymentMethodId) {
      return res
        .status(400)
        .json({ message: "Cannot remove the default payment method" });
    }

    await stripe.paymentMethods.detach(paymentMethodId);
    return res.status(200).json({ message: "Payment method removed" });
  },
];

