import { stripe } from "#stripe";

export const syncPricingForPeriods = async (
  tx,
  periods,
  tiers,
  tierMap,
  periodMap,
  existingPeriods,
  event,
  instanceId
) => {
  for (const p of periods) {
    const periodKey = p.id ?? `__new_period_${periods.indexOf(p)}`;
    const dbPeriodId = periodMap.get(periodKey);
    const existingPricing =
      existingPeriods.find((ep) => ep.id === p.id)?.registrationTiers ?? [];
    const seen = [];

    for (const price of p.prices) {
      const tierDbId = tierMap.get(price.tierId);
      const unitAmount = Math.round(parseFloat(price.price) * 100);
      const tierDef = tiers.find((t) => t.id === price.tierId);
      const productName = `${tierDef.name}: ${p.name}`;

      if (price.id && isNaN(Number(price.id))) {
        // update existing
        const pr = await tx.registrationPeriodPricing.findUnique({
          where: { id: price.id, deleted: false, instanceId },
        });
        await stripe.products.update(
          pr.stripe_productId,
          { name: productName },
          {
            stripeAccount: event.stripeConnectedAccountId,
          }
        );
        if (pr.price !== parseFloat(price.price)) {
          // archive old Stripe Price
          await stripe.prices.update(
            pr.stripe_priceId,
            { active: false },
            { stripeAccount: event.stripeConnectedAccountId }
          );
          // new Stripe Price
          const newStripePrice = await stripe.prices.create(
            {
              product: pr.stripe_productId,
              unit_amount: unitAmount,
              currency: "usd",
              nickname: p.name,
            },
            { stripeAccount: event.stripeConnectedAccountId }
          );
          await tx.registrationPeriodPricing.update({
            where: { id: price.id, instanceId },
            data: {
              price: parseFloat(price.price),
              available: price.isAvailable,
              stripe_priceId: newStripePrice.id,
            },
          });
        } else {
          await tx.registrationPeriodPricing.update({
            where: { id: price.id, instanceId },
            data: { available: price.isAvailable },
          });
          await stripe.prices.update(
            pr.stripe_priceId,
            { nickname: p.name },
            { stripeAccount: event.stripeConnectedAccountId }
          );
        }
        seen.push(price.id);
      } else {
        // new record
        const product = await stripe.products.create(
          { name: productName },
          { stripeAccount: event.stripeConnectedAccountId }
        );
        const newStripePrice = await stripe.prices.create(
          {
            product: product.id,
            unit_amount: unitAmount,
            currency: "usd",
            nickname: p.name,
          },
          { stripeAccount: event.stripeConnectedAccountId }
        );
        const created = await tx.registrationPeriodPricing.create({
          data: {
            registrationPeriodId: dbPeriodId,
            registrationTierId: tierDbId,
            price: parseFloat(price.price),
            available: price.isAvailable,
            stripe_productId: product.id,
            stripe_priceId: newStripePrice.id,
            eventId: event.id,
            instanceId,
          },
        });
        seen.push(created.id);
      }
    }

    // archive & remove deleted
    const toDelete = existingPricing
      .map((x) => x.id)
      .filter((id) => !seen.includes(id));

    for (const id of toDelete) {
      const pr = existingPricing.find((x) => x.id === id);
      if (pr?.stripe_productId) {
        await stripe.products.update(
          pr.stripe_productId,
          { active: false },
          { stripeAccount: event.stripeConnectedAccountId }
        );
      }
    }
    if (toDelete.length) {
      await tx.registrationPeriodPricing.updateMany({
        where: { id: { in: toDelete } },
        data: { deleted: true },
      });
    }
  }
};
