import { verifyAuth } from "#verifyAuth";
import { stripe } from "#stripe";

// GET /api/events/prospect/payment/setup
// Creates a temporary Stripe Customer and returns a SetupIntent + CustomerSession
// for adding a payment method before the Event is created. The resulting
// customerId and payment method can be passed to POST /api/events to start
// the subscription at creation time.
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    // Create a temporary customer for this user; we don't persist this in DB.
    const customer = await stripe.customers.create({
      email: req.user.email || undefined,
      name: req.user.name || undefined,
      metadata: {
        prospect: "true",
        prospectUserId: req.user.id,
      },
    });

    const intent = await stripe.setupIntents.create({
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      usage: "off_session",
      metadata: {
        prospect: "true",
        prospectUserId: req.user.id,
      },
    });

    const customerSession = await stripe.customerSessions.create({
      customer: customer.id,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay: "enabled",
            payment_method_save: "enabled",
            payment_method_save_usage: "on_session",
            payment_method_remove: "enabled",
          },
        },
      },
    });

    res.json({
      customerId: customer.id,
      intent: {
        id: intent.id,
        status: intent.status,
        client_secret: intent.client_secret,
      },
      customer_session: {
        id: customerSession.id,
        client_secret: customerSession.client_secret,
      },
    });
  },
];

