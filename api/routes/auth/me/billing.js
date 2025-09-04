import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { z } from "zod";

// GET /api/auth/me/billing
// - Returns payment methods, default, invoices, and flags
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        stripe_customerId: true,
        goodPaymentStanding: true,
        email: true,
        name: true,
      },
    });

    if (!me?.stripe_customerId) {
      return res.status(200).json({
        billing: {
          customerId: null,
          defaultPaymentMethodId: null,
          paymentMethods: [],
          invoices: [],
          billingEmail: me?.email || null,
          goodPaymentStanding: Boolean(me?.goodPaymentStanding),
        },
      });
    }

    // Fetch customer to get default_payment_method
    const customer = await stripe.customers.retrieve(me.stripe_customerId);
    // List attached card payment methods
    const pms = await stripe.paymentMethods.list({
      customer: me.stripe_customerId,
      type: "card",
    });

    // List invoices and expand charges to obtain receipt links
    const invoices = await stripe.invoices.list({
      customer: me.stripe_customerId,
      limit: 24,
      expand: ["data.charge"],
    });

    const defaultPaymentMethodId =
      customer?.invoice_settings?.default_payment_method || null;

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
      receiptUrl: i.charge && typeof i.charge !== "string" ? i.charge.receipt_url : null,
      created: i.created,
    }));

    res.json({
      billing: {
        customerId: me.stripe_customerId,
        defaultPaymentMethodId,
        paymentMethods,
        invoices: inv,
        billingEmail: customer?.email || me.email || null,
        goodPaymentStanding: Boolean(me.goodPaymentStanding),
      },
    });
  },
];

// PATCH /api/auth/me/billing
// - Update default payment method and/or billing email
export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripe_customerId: true },
    });

    if (!me?.stripe_customerId) {
      return res.status(400).json({ message: "Stripe customer not found" });
    }

    const schema = z.object({
      defaultPaymentMethodId: z.string().optional(),
      billingEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const { defaultPaymentMethodId, billingEmail } = parsed.data;

    const updates = {};
    if (defaultPaymentMethodId) {
      updates["invoice_settings"] = {
        default_payment_method: defaultPaymentMethodId,
      };
    }
    if (billingEmail) {
      updates["email"] = billingEmail;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No updates provided" });
    }

    await stripe.customers.update(me.stripe_customerId, updates);

    return res.status(200).json({ message: "Billing updated" });
  },
];

// QUERY /api/auth/me/billing
// - Return a lightweight schema description for clients
export const query = [
  verifyAuth(["manager"]),
  async (_req, res) => {
    res.json({
      schema: {
        get: {
          billing: {
            customerId: "string|null",
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

