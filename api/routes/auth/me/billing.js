import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";

// GET /api/auth/me/billing
// - Returns payment methods, default, invoices, and flags
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    // User-level billing deprecated; return empty structure
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, name: true },
    });

    res.json({
      billing: {
        customerId: null,
        defaultPaymentMethodId: null,
        paymentMethods: [],
        invoices: [],
        billingEmail: me?.email || null,
        goodPaymentStanding: false,
      },
    });
  },
];

// PATCH /api/auth/me/billing
// - Update default payment method and/or billing email
export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const schema = z.object({
      defaultPaymentMethodId: z.string().optional(),
      billingEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request" });
    }
    return res.status(400).json({ message: "User-level billing disabled" });
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
