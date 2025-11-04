import { verifyAuth } from "#verifyAuth";
import { stripe, isStripeMock } from "#stripe";

// GET /api/events/prospect/payment/setup
// Creates a temporary Stripe Customer and returns a SetupIntent + CustomerSession
// for adding a payment method before the Event is created. The resulting
// customerId and payment method can be passed to POST /api/events to start
// the subscription at creation time.
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    if (isStripeMock) {
      const customerId = `cus_mock_${req.user.id}`;
      return res.json({
        customerId,
        intent: {
          id: `seti_mock_${req.user.id}`,
          status: "succeeded",
          client_secret: `seti_mock_secret_${req.user.id}`,
        },
        customer_session: {
          id: `cs_mock_${req.user.id}`,
          client_secret: `cs_mock_secret_${req.user.id}`,
        },
      });
    }

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
