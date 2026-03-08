import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    registration: {
      findUnique: vi.fn(),
    },
    ledgerItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("#prisma", () => ({ prisma }));
vi.mock("#stripe", () => ({
  stripe: {
    balanceTransactions: {
      retrieve: vi.fn(),
    },
  },
}));

import { createLedgerItemForRegistration } from "./ledger.js";

describe("createLedgerItemForRegistration", () => {
  beforeEach(() => {
    prisma.registration.findUnique.mockReset();
    prisma.ledgerItem.findFirst.mockReset();
    prisma.ledgerItem.update.mockReset();
    prisma.ledgerItem.create.mockReset();
  });

  it("updates an existing registration ledger row for the same payment intent", async () => {
    prisma.registration.findUnique.mockResolvedValue({
      crmPersonId: "person_1",
    });
    prisma.ledgerItem.findFirst.mockResolvedValue({
      id: "ledger_1",
      crmPersonId: null,
      registrationId: null,
      instanceId: "inst_old",
      originalAmount: 0,
      amount: 0,
    });
    prisma.ledgerItem.update.mockResolvedValue({ id: "ledger_1" });

    const result = await createLedgerItemForRegistration({
      eventId: "event_1",
      instanceId: "inst_1",
      registrationId: "reg_1",
      amount: 12.5,
      originalAmount: 15,
      stripe_paymentIntentId: "pi_1",
    });

    expect(prisma.ledgerItem.create).not.toHaveBeenCalled();
    expect(prisma.ledgerItem.update).toHaveBeenCalledWith({
      where: { id: "ledger_1" },
      data: {
        crmPersonId: "person_1",
        registrationId: "reg_1",
        instanceId: "inst_1",
        originalAmount: 15,
        amount: 12.5,
      },
    });
    expect(result).toEqual({ id: "ledger_1" });
  });
});
