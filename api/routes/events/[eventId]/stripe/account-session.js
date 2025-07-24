import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
      });
      let accountId = event.stripeConnectedAccountId;
      let account;

      if (!accountId || accountId === null) {
        // Create a new Stripe connected account

        account = await stripe.accounts.create({
          controller: {
            fees: { payer: "application" },
            losses: { payments: "application" },
            stripe_dashboard: { type: "none" },
            requirement_collection: "application",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
            link_payments: { requested: false },
          },
          country: "US",
          email: req.user.email,
          business_profile: {
            url: `https://${event.slug}.geteventpilot.com`,
            mcc: "7999",
          },
        });
        accountId = account.id;

        await prisma.event.update({
          where: { id: req.params.eventId },
          data: {
            stripeConnectedAccountId: account.id,
          },
        });

        await prisma.logs.create({
          data: {
            type: "STRIPE_CONNECTED_ACCOUNT_CREATED",
            eventId: req.params.eventId,
            userId: req.user.id,
            data: JSON.stringify(account),
          },
        });
      } else {
        account = await stripe.accounts.retrieve(accountId);
      }

      const accountSession = await stripe.accountSessions.create({
        account: accountId,
        components: {
          account_onboarding: {
            enabled: true,
            features: {
              disable_stripe_user_authentication: true,
            },
          },
          account_management: {
            enabled: true,
            features: {
              disable_stripe_user_authentication: true,
            },
          },
          notification_banner: {
            enabled: true,
            features: {
              disable_stripe_user_authentication: true,
            },
          },
        },
      });

      res.json({
        client_secret: accountSession.client_secret,
        accountId,
        account,
      });
    } catch (error) {
      console.error(
        "An error occurred when calling the Stripe API to create an account",
        error.message
      );
      res.status(500);
      res.send({ error: error.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    let event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await stripe.accounts.del(event.stripeConnectedAccountId);

    event = await prisma.event.update({
      where: { id: req.params.eventId },
      data: {
        stripeConnectedAccountId: null,
      },
    });

    res.json({
      event,
    });
  },
];
