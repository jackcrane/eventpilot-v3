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
      },
    });

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!req.user.stripe_customerId)
      return res.status(400).json({ message: "Stripe customer not found" });

    let subscription = null;
    if (event.stripe_subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(
        event.stripe_subscriptionId
      );
    }

    // Fetch customer + PMs
    const customer = await stripe.customers.retrieve(req.user.stripe_customerId);
    const pms = await stripe.paymentMethods.list({
      customer: req.user.stripe_customerId,
      type: "card",
    });

    // Invoices for this subscription only
    const invoices = event.stripe_subscriptionId
      ? await stripe.invoices.list({
          customer: req.user.stripe_customerId,
          subscription: event.stripe_subscriptionId,
          limit: 24,
          expand: ["data.charge"],
        })
      : { data: [] };

    const defaultPaymentMethodId =
      subscription?.default_payment_method ||
      customer?.invoice_settings?.default_payment_method ||
      null;

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

    // Persist goodPaymentStanding based on current subscription status
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
        billingEmail: customer?.email || null,
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
      select: { stripe_subscriptionId: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!req.user.stripe_customerId)
      return res.status(400).json({ message: "Stripe customer not found" });

    const schema = z.object({
      defaultPaymentMethodId: z.string().optional(),
      billingEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid request" });

    const { defaultPaymentMethodId, billingEmail } = parsed.data;

    if (defaultPaymentMethodId && event.stripe_subscriptionId) {
      await stripe.subscriptions.update(event.stripe_subscriptionId, {
        default_payment_method: defaultPaymentMethodId,
      });
    }

    if (billingEmail) {
      await stripe.customers.update(req.user.stripe_customerId, {
        email: billingEmail,
      });
    }

    return res.status(200).json({ message: "Billing updated" });
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
