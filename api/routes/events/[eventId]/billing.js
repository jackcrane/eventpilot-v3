import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { z } from "zod";

// GET /api/events/:eventId/billing
// Returns event-scoped billing info: subscription, PMs, invoices
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.eventId,
        userId: req.user.id,
      },
      select: {
        id: true,
        stripe_subscriptionId: true,
        stripe_customerId: true,
        contactEmail: true,
      },
    });

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.stripe_customerId)
      return res.status(200).json({
        billing: {
          subscriptionId: null,
          subscriptionStatus: null,
          defaultPaymentMethodId: null,
          paymentMethods: [],
          invoices: [],
          upcomingInvoice: null,
          billingEmail: null,
          goodPaymentStanding: false,
        },
      });

    let subscription = null;
    if (event.stripe_subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(
        event.stripe_subscriptionId
      );
    }

    // Fetch customer + PMs
    const customer = await stripe.customers.retrieve(event.stripe_customerId);
    const pms = await stripe.paymentMethods.list({
      customer: event.stripe_customerId,
      type: "card",
    });

    // Invoices for this subscription only
    const invoices = event.stripe_subscriptionId
      ? await stripe.invoices.list({
          customer: event.stripe_customerId,
          subscription: event.stripe_subscriptionId,
          limit: 24,
          expand: ["data.charge"],
        })
      : { data: [] };

    // Upcoming invoice (amount and next payment time)
    let upcomingInvoiceRaw = null;
    if (event.stripe_subscriptionId) {
      try {
        upcomingInvoiceRaw = await stripe.invoices.retrieveUpcoming({
          customer: event.stripe_customerId,
          subscription: event.stripe_subscriptionId,
        });
      } catch (e) {
        // No upcoming invoice or cannot be retrieved
        upcomingInvoiceRaw = null;
      }
    }

    const defaultPaymentMethodId =
      subscription?.default_payment_method ||
      customer?.invoice_settings?.default_payment_method ||
      null;
    const hasDefault = Boolean(defaultPaymentMethodId);

    const paymentMethods = (pms?.data || []).map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || null,
      last4: pm.card?.last4 || null,
      expMonth: pm.card?.exp_month || null,
      expYear: pm.card?.exp_year || null,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    const inv = (invoices?.data || []).map((i) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      currency: i.currency,
      amountDue: i.amount_due,
      amountPaid: i.amount_paid,
      hostedInvoiceUrl: i.hosted_invoice_url,
      invoicePdf: i.invoice_pdf,
      receiptUrl:
        i.charge && typeof i.charge !== "string" ? i.charge.receipt_url : null,
      created: i.created,
    }));

    // Fallback: if no upcoming invoice, try to use latest open/draft invoice
    let fallbackInvoice = null;
    if (!upcomingInvoiceRaw) {
      try {
        const openInvoices = await stripe.invoices.list({
          customer: event.stripe_customerId,
          subscription: event.stripe_subscriptionId,
          status: "open",
          limit: 1,
        });
        fallbackInvoice = openInvoices?.data?.[0] || null;
        if (!fallbackInvoice) {
          const draftInvoices = await stripe.invoices.list({
            customer: event.stripe_customerId,
            subscription: event.stripe_subscriptionId,
            status: "draft",
            limit: 1,
          });
          fallbackInvoice = draftInvoices?.data?.[0] || null;
        }
      } catch (e) {
        // ignore
      }
    }

    let upcomingSource = upcomingInvoiceRaw || fallbackInvoice || null;
    // Derive next payment timestamp with sane fallbacks
    let nextPaymentAt = null;
    let byPeriodEnd = false;
    if (upcomingSource) {
      nextPaymentAt =
        upcomingSource.next_payment_attempt ||
        upcomingSource.due_date ||
        // Try to derive from invoice lines
        (Array.isArray(upcomingSource.lines?.data)
          ? Math.max(
              0,
              ...upcomingSource.lines.data
                .map((l) => l?.period?.end || 0)
                .filter(Boolean)
            )
          : 0) ||
        subscription?.current_period_end ||
        null;
      if (
        !upcomingSource.next_payment_attempt &&
        !upcomingSource.due_date &&
        nextPaymentAt &&
        subscription?.current_period_end &&
        nextPaymentAt === subscription.current_period_end
      ) {
        byPeriodEnd = true;
      }
    }

    let upcomingAmount = null;
    let upcomingCurrency = null;
    if (upcomingSource) {
      // prefer invoice total/amount_due
      upcomingAmount =
        upcomingSource.total ?? upcomingSource.amount_due ?? null;
      upcomingCurrency = upcomingSource.currency ?? null;
    }

    let upcomingInvoice = null;
    if (upcomingSource) {
      upcomingInvoice = {
        amountDue: upcomingAmount ?? 0,
        currency: upcomingCurrency || "usd",
        nextPaymentAttempt: nextPaymentAt,
        byPeriodEnd,
      };
    }

    // If still no upcoming invoice but we have a subscription, construct a preview
    if (!upcomingInvoice && subscription) {
      try {
        const items = subscription.items?.data || [];
        const amount = items.reduce((sum, it) => {
          const unit =
            it.price?.unit_amount ??
            (it.price?.unit_amount_decimal
              ? Math.round(parseFloat(it.price.unit_amount_decimal))
              : 0);
        const qty = it.quantity ?? 1;
          return sum + unit * qty;
        }, 0);
        const currency = items[0]?.price?.currency || "usd";
        upcomingInvoice = {
          amountDue: amount,
          currency,
          nextPaymentAttempt: subscription.current_period_end || null,
          byPeriodEnd: Boolean(subscription?.current_period_end),
        };
      } catch {}
    }

    // Ensure we provide a concrete nextPaymentAttempt when possible
    if (subscription && upcomingInvoice && !upcomingInvoice.nextPaymentAttempt) {
      if (subscription.current_period_end) {
        upcomingInvoice.nextPaymentAttempt = subscription.current_period_end;
        upcomingInvoice.byPeriodEnd = true;
      }
    }

    // Persist event.goodPaymentStanding based on subscription status only
    try {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          goodPaymentStanding: ["active", "trialing"].includes(
            subscription?.status || ""
          ),
        },
      });
    } catch {}

    res.json({
      billing: {
        subscriptionId: event.stripe_subscriptionId || null,
        subscriptionStatus: subscription?.status || null,
        defaultPaymentMethodId,
        paymentMethods,
        invoices: inv,
        upcomingInvoice,
        billingEmail: event.contactEmail || null,
        // Standing requires an existing subscription in good status
        goodPaymentStanding: ["active", "trialing"].includes(
          subscription?.status || ""
        ),
      },
    });
  },
];

// PATCH /api/events/:eventId/billing
// Update subscription default payment method and/or billing email (customer)
export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.eventId,
        userId: req.user.id,
      },
      select: { stripe_subscriptionId: true, stripe_customerId: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.stripe_customerId)
      return res.status(400).json({ message: "Stripe customer not found" });

    const schema = z.object({
      defaultPaymentMethodId: z.string().optional(),
      billingEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid request" });

    const { defaultPaymentMethodId, billingEmail } = parsed.data;

    let subscriptionId = event.stripe_subscriptionId;
    if (defaultPaymentMethodId) {
      // Ensure PM is attached to the event's customer first
      try {
        const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
        const pmCustomer =
          typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
        if (!pmCustomer) {
          await stripe.paymentMethods.attach(defaultPaymentMethodId, {
            customer: event.stripe_customerId,
          });
        } else if (pmCustomer !== event.stripe_customerId) {
          return res.status(400).json({
            message:
              "The selected payment method is not attached to this event. Please add it under Billing.",
          });
        }
      } catch (e) {
        return res
          .status(400)
          .json({ message: e?.message || "Invalid payment method" });
      }

      if (subscriptionId) {
        await stripe.subscriptions.update(subscriptionId, {
          default_payment_method: defaultPaymentMethodId,
        });
      } else {
        // Create subscription if missing
        const priceId = process.env.STRIPE_EVENT_SUBSCRIPTION_PRICE_ID;
        if (!priceId) {
          return res
            .status(500)
            .json({ message: "Missing STRIPE_EVENT_SUBSCRIPTION_PRICE_ID" });
        }
        const sub = await stripe.subscriptions.create({
          customer: event.stripe_customerId,
          items: [{ price: priceId }],
          default_payment_method: defaultPaymentMethodId,
          metadata: { eventId: req.params.eventId },
        });
        subscriptionId = sub.id;
        await prisma.event.update({
          where: { id: req.params.eventId },
          data: {
            stripe_subscriptionId: sub.id,
            goodPaymentStanding: ["active", "trialing"].includes(
              sub?.status || ""
            ),
          },
        });
      }
    }

    if (billingEmail) {
      await stripe.customers.update(event.stripe_customerId, {
        email: billingEmail,
      });
      await prisma.event.update({
        where: { id: req.params.eventId },
        data: { contactEmail: billingEmail },
      });
    }

    // Attempt to auto-pay any open invoice for this subscription
    try {
      if (subscriptionId) {
        const openInvoices = await stripe.invoices.list({
          customer: event.stripe_customerId,
          subscription: subscriptionId,
          status: "open",
          limit: 1,
        });
        if (openInvoices?.data?.length) {
          await stripe.invoices.pay(openInvoices.data[0].id);
        }
      }
    } catch (e) {
      // non-fatal
      console.warn("[STRIPE] Failed to auto-pay invoice", e?.message || e);
    }

    return res.status(200).json({ message: "Billing updated" });
  },
];

// DELETE /api/events/:eventId/billing
// Cancel the event's subscription immediately
export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.eventId,
        userId: req.user.id,
      },
      select: { stripe_subscriptionId: true, stripe_customerId: true },
    });

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.stripe_subscriptionId)
      return res.status(400).json({ message: "No active subscription to cancel" });

    try {
      await stripe.subscriptions.cancel(event.stripe_subscriptionId);
    } catch (e) {
      return res
        .status(400)
        .json({ message: e?.message || "Failed to cancel subscription" });
    }

    // Reflect cancellation locally; webhook should also update this
    try {
      await prisma.event.update({
        where: { id: req.params.eventId },
        data: { goodPaymentStanding: false },
      });
    } catch {}

    return res.status(200).json({ message: "Subscription canceled" });
  },
];

export const query = [
  verifyAuth(["manager"]),
  async (_req, res) => {
    res.json({
      schema: {
        get: {
          billing: {
            subscriptionId: "string|null",
            subscriptionStatus: "string|null",
            defaultPaymentMethodId: "string|null",
            paymentMethods: [
              {
                id: "string",
                brand: "string|null",
                last4: "string|null",
                expMonth: "number|null",
                expYear: "number|null",
                isDefault: "boolean",
              },
            ],
            invoices: [
              {
                id: "string",
                number: "string|null",
                status: "string",
                currency: "string",
                amountDue: "number",
                amountPaid: "number",
                hostedInvoiceUrl: "string|null",
                invoicePdf: "string|null",
                receiptUrl: "string|null",
                created: "number",
              },
            ],
            billingEmail: "string|null",
            goodPaymentStanding: "boolean",
          },
        },
        patch: {
          defaultPaymentMethodId: "string?",
          billingEmail: "email?",
        },
      },
    });
  },
];
