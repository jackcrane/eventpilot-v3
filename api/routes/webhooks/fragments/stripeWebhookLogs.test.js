import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    logs: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("#prisma", () => ({ prisma }));

import {
  ensureStripeLog,
  syncStripeLogAssociations,
} from "./stripeWebhookLogs.js";

describe("stripeWebhookLogs", () => {
  beforeEach(() => {
    prisma.logs.findFirst.mockReset();
    prisma.logs.update.mockReset();
    prisma.logs.create.mockReset();
    prisma.logs.updateMany.mockReset();
  });

  it("updates an existing stripe log instead of creating a duplicate", async () => {
    prisma.logs.findFirst.mockResolvedValue({ id: "log_existing" });
    prisma.logs.update.mockResolvedValue({ id: "log_existing" });

    const result = await ensureStripeLog({
      type: "STRIPE_WEBHOOK_RECEIVED",
      objectId: "evt_123",
      data: { id: "evt_123" },
      eventId: "event_1",
      crmPersonId: "person_1",
    });

    expect(prisma.logs.findFirst).toHaveBeenCalledWith({
      where: {
        type: "STRIPE_WEBHOOK_RECEIVED",
        data: {
          path: ["id"],
          equals: "evt_123",
        },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(prisma.logs.update).toHaveBeenCalledWith({
      where: { id: "log_existing" },
      data: {
        data: { id: "evt_123" },
        eventId: "event_1",
        crmPersonId: "person_1",
      },
    });
    expect(prisma.logs.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "log_existing" });
  });

  it("creates a stripe log when no existing row is found", async () => {
    prisma.logs.findFirst.mockResolvedValue(null);
    prisma.logs.create.mockResolvedValue({ id: "log_new" });

    const result = await ensureStripeLog({
      type: "STRIPE_PAYMENT_INTENT_SUCCEEDED",
      objectId: "pi_123",
      data: { id: "pi_123" },
      eventId: "event_1",
      crmPersonId: null,
    });

    expect(prisma.logs.create).toHaveBeenCalledWith({
      data: {
        type: "STRIPE_PAYMENT_INTENT_SUCCEEDED",
        data: { id: "pi_123" },
        eventId: "event_1",
        crmPersonId: null,
      },
    });
    expect(result).toEqual({ id: "log_new" });
  });

  it("syncs final event and crm associations across related logs", async () => {
    await syncStripeLogAssociations({
      logIds: ["log_1", "log_2", "log_1", null],
      eventId: "event_1",
      crmPersonId: "person_1",
    });

    expect(prisma.logs.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["log_1", "log_2"] },
      },
      data: {
        eventId: "event_1",
        crmPersonId: "person_1",
      },
    });
  });
});
