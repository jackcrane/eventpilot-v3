import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prisma,
  stripe,
  resolveStripeAffiliations,
  ensureCrmPersonForPaymentIntent,
  ensureStripeLog,
  syncStripeLogAssociations,
  finalizeRegistration,
  createLedgerItemForRegistration,
  ensurePointOfSaleLedgerForPaymentIntent,
} = vi.hoisted(() => ({
  prisma: {
    eventInstance: {
      findFirst: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
  },
  stripe: {
    balanceTransactions: {
      retrieve: vi.fn(),
    },
  },
  resolveStripeAffiliations: vi.fn(),
  ensureCrmPersonForPaymentIntent: vi.fn(),
  ensureStripeLog: vi.fn(),
  syncStripeLogAssociations: vi.fn(),
  finalizeRegistration: vi.fn(),
  createLedgerItemForRegistration: vi.fn(),
  ensurePointOfSaleLedgerForPaymentIntent: vi.fn(),
}));

vi.mock("#prisma", () => ({ prisma }));
vi.mock("#stripe", () => ({ stripe }));
vi.mock("./stripeWebhookAffiliations.js", () => ({
  resolveStripeAffiliations,
}));
vi.mock("../../../util/crmPersonFromPaymentIntent.js", () => ({
  ensureCrmPersonForPaymentIntent,
}));
vi.mock("./stripeWebhookLogs.js", () => ({
  ensureStripeLog,
  syncStripeLogAssociations,
}));
vi.mock("../../../util/finalizeRegistration.js", () => ({
  finalizeRegistration,
}));
vi.mock("../../../util/ledger.js", () => ({
  createLedgerItemForRegistration,
  ensurePointOfSaleLedgerForPaymentIntent,
}));

import { handlePaymentIntentSucceededWebhook } from "./stripeWebhookPaymentIntent.js";

describe("handlePaymentIntentSucceededWebhook", () => {
  beforeEach(() => {
    prisma.eventInstance.findFirst.mockReset();
    prisma.event.findUnique.mockReset();
    stripe.balanceTransactions.retrieve.mockReset();
    resolveStripeAffiliations.mockReset();
    ensureCrmPersonForPaymentIntent.mockReset();
    ensureStripeLog.mockReset();
    syncStripeLogAssociations.mockReset();
    finalizeRegistration.mockReset();
    createLedgerItemForRegistration.mockReset();
    ensurePointOfSaleLedgerForPaymentIntent.mockReset();

    ensureStripeLog.mockResolvedValue({ id: "log_pi" });
    syncStripeLogAssociations.mockResolvedValue(undefined);
    prisma.eventInstance.findFirst.mockResolvedValue({ id: "inst_1" });
  });

  it("finalizes CRM and ledger deterministically for point-of-sale payments", async () => {
    resolveStripeAffiliations.mockResolvedValue({
      eventId: "event_1",
      crmPersonId: null,
      stripeAccountId: "acct_1",
      cardMatchInfo: {
        attempted: true,
        matched: false,
        matchType: null,
        context: {},
      },
    });
    ensureCrmPersonForPaymentIntent.mockResolvedValue({
      crmPerson: { id: "person_1" },
      created: false,
    });

    await handlePaymentIntentSucceededWebhook({
      stripeEvent: {
        data: {
          object: {
            id: "pi_1",
            amount: 2500,
            metadata: {
              scope: "EVENTPILOT:POINT_OF_SALE",
              eventId: "event_1",
              instanceId: "inst_1",
            },
          },
        },
      },
      webhookReceiptLogId: "log_receipt",
    });

    expect(ensureCrmPersonForPaymentIntent).toHaveBeenCalledWith({
      paymentIntent: expect.objectContaining({ id: "pi_1" }),
      eventId: "event_1",
      stripeAccountId: "acct_1",
    });
    expect(ensureStripeLog).toHaveBeenCalledWith({
      type: "STRIPE_PAYMENT_INTENT_SUCCEEDED",
      objectId: "pi_1",
      data: expect.objectContaining({ id: "pi_1" }),
      eventId: "event_1",
      crmPersonId: "person_1",
    });
    expect(syncStripeLogAssociations).toHaveBeenCalledWith({
      logIds: ["log_receipt", "log_pi"],
      eventId: "event_1",
      crmPersonId: "person_1",
    });
    expect(ensurePointOfSaleLedgerForPaymentIntent).toHaveBeenCalledWith({
      paymentIntent: expect.objectContaining({ id: "pi_1" }),
      eventId: "event_1",
      instanceId: "inst_1",
      crmPersonId: "person_1",
      stripeAccountId: "acct_1",
      dayOfDashboardAccountId: null,
    });
  });

  it("uses the final event affiliation for registration ledger creation", async () => {
    resolveStripeAffiliations.mockResolvedValue({
      eventId: "event_1",
      crmPersonId: "person_1",
      stripeAccountId: "acct_1",
      cardMatchInfo: null,
    });
    prisma.event.findUnique.mockResolvedValue({
      stripeConnectedAccountId: "acct_1",
    });
    stripe.balanceTransactions.retrieve.mockResolvedValue({
      net: 1875,
    });
    finalizeRegistration.mockResolvedValue({ crmPersonId: "person_1" });

    await handlePaymentIntentSucceededWebhook({
      stripeEvent: {
        data: {
          object: {
            id: "pi_2",
            amount: 2000,
            charges: {
              data: [
                {
                  receipt_url: "https://stripe.test/receipt",
                  balance_transaction: "txn_1",
                },
              ],
            },
            metadata: {
              scope: "EVENTPILOT:REGISTRATION",
              registrationId: "reg_1",
              instanceId: "inst_1",
            },
          },
        },
      },
      webhookReceiptLogId: "log_receipt",
    });

    expect(ensureCrmPersonForPaymentIntent).not.toHaveBeenCalled();
    expect(finalizeRegistration).toHaveBeenCalledWith({
      registrationId: "reg_1",
      eventId: "event_1",
      receiptUrl: "https://stripe.test/receipt",
      paymentIntent: expect.objectContaining({ id: "pi_2" }),
      instanceId: "inst_1",
    });
    expect(createLedgerItemForRegistration).toHaveBeenCalledWith({
      eventId: "event_1",
      instanceId: "inst_1",
      registrationId: "reg_1",
      amount: 18.75,
      stripe_paymentIntentId: "pi_2",
      crmPersonId: "person_1",
    });
  });
});
