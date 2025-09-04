import { prisma } from "#prisma";
import { LedgerItemSource, LogType } from "@prisma/client";

// Creates a ledger item for a registration payment and logs the creation.
// Skips creation if amount <= 0.
export async function createLedgerItemForRegistration({
  eventId,
  instanceId,
  registrationId,
  amount,
  stripe_paymentIntentId = null,
}) {
  if (!eventId || !instanceId || !registrationId) return null;
  if (!amount || amount <= 0) return null;

  const item = await prisma.ledgerItem.create({
    data: {
      eventId,
      instanceId,
      amount,
      source: LedgerItemSource.REGISTRATION,
      stripe_paymentIntentId,
      logs: {
        create: {
          type: LogType.LEDGER_ITEM_CREATED,
          data: stripe_paymentIntentId
            ? { stripe_paymentIntentId }
            : { amount },
          eventId,
          instanceId,
          registrationId,
        },
      },
    },
  });

  return item;
}
