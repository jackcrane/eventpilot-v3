import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { LogType } from "@prisma/client";

export const deleteMissingPeriods = async (
  tx,
  existing,
  incomingDbIds,
  event
) => {
  const toDelete = existing
    .filter((p) => !incomingDbIds.includes(p.id))
    .map((p) => p.id);
  if (toDelete.length) {
    console.log("Deleting periods", toDelete);

    await tx.registrationPeriod.updateMany({
      where: { id: { in: toDelete } },
      data: { deleted: true },
    });

    const periodPricingToDelete =
      await prisma.registrationPeriodPricing.findMany({
        where: { registrationPeriod: { id: { in: toDelete } } },
      });

    for (const pr of periodPricingToDelete) {
      try {
        await stripe.products.update(
          pr.stripe_productId,
          { active: false },
          { stripeAccount: event.stripeConnectedAccountId }
        );
      } catch (e) {
        const code = e.code;
        if (code === "resource_missing") {
          console.log("Stripe product not found, hard deleting it", e.code);
          await tx.registrationPeriodPricing.delete({
            where: { id: pr.id },
          });
        }
      }
    }

    await tx.registrationPeriodPricing.updateMany({
      where: { registrationPeriod: { id: { in: toDelete } } },
      data: { deleted: true },
    });
  }
};
