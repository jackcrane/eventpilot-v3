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
  crmPersonId,
  originalAmount,
}) {
  // This helper is intended for registration-tied ledger items
  if (!eventId || !instanceId || !registrationId) return null;
  if (!amount || amount <= 0) return null;

  // Compute originalAmount (before coupons/discounts) from snapshots if not provided
  let computedOriginal = originalAmount;
  if (computedOriginal == null) {
    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { upsells: true },
    });
    const regPrice = Number(reg?.priceSnapshot ?? 0);
    const upsellTotal = (reg?.upsells || []).reduce(
      (sum, u) => sum + Number(u.priceSnapshot ?? 0) * Number(u.quantity ?? 1),
      0
    );
    computedOriginal = regPrice + upsellTotal;
  }

  // Resolve crmPersonId from the registration if not provided
  let personId = crmPersonId;
  if (!personId) {
    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { crmPersonId: true },
    });
    personId = reg?.crmPersonId || null;
  }
  if (!personId) return null; // Enforce that all ledger items have a CRM person

  const item = await prisma.ledgerItem.create({
    data: {
      eventId,
      instanceId,
      registrationId,
      crmPersonId: personId,
      amount,
      originalAmount: computedOriginal,
      source: LedgerItemSource.REGISTRATION,
      stripe_paymentIntentId,
      logs: {
        create: {
          type: LogType.LEDGER_ITEM_CREATED,
          data: stripe_paymentIntentId
            ? {
                stripe_paymentIntentId,
                amount,
                originalAmount: computedOriginal,
              }
            : { amount, originalAmount: computedOriginal },
          eventId,
          instanceId,
          registrationId,
        },
      },
    },
  });

  return item;
}
