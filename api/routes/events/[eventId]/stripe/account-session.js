import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { reportApiError } from "#util/reportApiError.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
      });
      let accountId = event.stripeConnectedAccountId;
      let account;
      let isNew = false;

      console.log("Account ID", accountId);
      if (!accountId) {
        // create new Express account
        console.log("Creating new Stripe account");
        account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: req.user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            url: `https://${event.slug}.geteventpilot.com`,
            mcc: "7999",
          },
          settings: {
            payments: {
              statement_descriptor: event.slug.toUpperCase(),
            },
            payouts: {
              statement_descriptor: event.slug.toUpperCase(),
            },
          },
        });

        accountId = account.id;
        isNew = true;

        await prisma.event.update({
          where: { id: req.params.eventId },
          data: { stripeConnectedAccountId: accountId },
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
        // fetch existing account
        account = await stripe.accounts.retrieve(accountId);
      }

      if (account.details_submitted === false) {
        isNew = true;
      }

      // decide link type based on whether it's a new account
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `https://geteventpilot.com/events/${event.id}`,
        return_url: `https://geteventpilot.com/events/${event.id}`,
        type: "account_onboarding",
        collect: "eventually_due",
      });

      let loginUrl;
      if (!isNew) {
        const { url } = await stripe.accounts.createLoginLink(accountId, {
          redirect_url: `https://geteventpilot.com/events/${event.id}`,
        });
        loginUrl = url;
      }

      return res.json({
        url: accountLink.url,
        accountId,
        account,
        loginUrl,
        isNew,
      });
    } catch (err) {
      console.error("Stripe error:", err.message);
      reportApiError(err, req);
      return res.status(500).json({ error: err.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
      });
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!event.stripeConnectedAccountId) {
        return res.status(400).json({ message: "No connected Stripe account" });
      }

      try {
        await stripe.accounts.del(event.stripeConnectedAccountId);
        // eslint-disable-next-line
      } catch (e) {
        null;
      }

      const updated = await prisma.event.update({
        where: { id: req.params.eventId },
        data: { stripeConnectedAccountId: null },
      });

      return res.json({ event: updated });
    } catch (err) {
      console.error("Error deleting Stripe account:", err.message);
      reportApiError(err, req);
      return res.status(500).json({ error: err.message });
    }
  },
];
