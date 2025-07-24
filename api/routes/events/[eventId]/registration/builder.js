import { z } from "zod";
import { verifyAuth } from "#verifyAuth";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";
import { prisma } from "#prisma";

export const registrationBuilderSchema = z.object({
  tiers: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(2),
      })
    )
    .min(1),
  periods: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(2),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        startTimeTz: z.string(),
        endTimeTz: z.string(),
        prices: z.array(
          z.object({
            id: z.union([z.string(), z.number()]).optional(),
            tierId: z.union([z.string(), z.number()]).optional(),
            price: z.union([z.string().min(1), z.number()]),
            isAvailable: z.boolean(),
          })
        ),
      })
    )
    .min(1),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const [tiers, periodsRaw] = await Promise.all([
        prisma.registrationTier.findMany({
          where: { eventId },
          orderBy: { order: "asc" },
        }),
        prisma.registrationPeriod.findMany({
          where: { eventId },
          orderBy: { startTime: "asc" },
          include: { registrationTiers: true },
        }),
      ]);

      // shape response
      const tiersOut = tiers.map((t) => ({
        id: t.id,
        name: t.name,
      }));

      const periodsOut = periodsRaw.map((p) => ({
        ...p,
        prices: p.registrationTiers.map((pt) => ({
          id: pt.id,
          tierId: pt.registrationTierId,
          price: pt.price.toFixed(2),
          isAvailable: pt.available,
        })),
      }));

      return res.status(200).json({ tiers: tiersOut, periods: periodsOut });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const result = registrationBuilderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }
      const { tiers, periods } = result.data;
      const { eventId } = req.params;

      // fetch existing
      const existingTiers = await prisma.registrationTier.findMany({
        where: { eventId },
      });
      const existingPeriods = await prisma.registrationPeriod.findMany({
        where: { eventId },
        include: { registrationTiers: true },
      });

      // maps from input ID (or temp key) → real DB ID
      const tierIdMap = new Map();
      const periodIdMap = new Map();

      await prisma.$transaction(async (tx) => {
        // 1) tiers: create/update
        for (let i = 0; i < tiers.length; i++) {
          const inputId = tiers[i].id ?? `__new_tier_${i}`;
          const data = { name: tiers[i].name, order: i, eventId };
          if (tiers[i].id && isNaN(Number(tiers[i].id))) {
            await tx.registrationTier.update({
              where: { id: tiers[i].id },
              data,
            });
            tierIdMap.set(inputId, tiers[i].id);
          } else {
            const created = await tx.registrationTier.create({ data });
            tierIdMap.set(inputId, created.id);
          }
        }
        // 2) tiers: delete missing
        const incomingTierDbIds = Array.from(tierIdMap.values());
        const toDeleteTiers = existingTiers
          .filter((t) => !incomingTierDbIds.includes(t.id))
          .map((t) => t.id);

        if (toDeleteTiers.length) {
          await tx.registrationTier.deleteMany({
            where: { id: { in: toDeleteTiers } },
          });
        }

        // 3) periods: create/update
        for (let i = 0; i < periods.length; i++) {
          const p = periods[i];
          const inputId = p.id ?? `__new_period_${i}`;
          const data = {
            name: p.name,
            startTime: new Date(p.startTime),
            endTime: new Date(p.endTime),
            startTimeTz: p.startTimeTz,
            endTimeTz: p.endTimeTz,
          };
          if (p.id && isNaN(Number(p.id))) {
            await tx.registrationPeriod.update({
              where: { id: p.id },
              data,
            });
            periodIdMap.set(inputId, p.id);
          } else {
            const created = await tx.registrationPeriod.create({
              data: { ...data, event: { connect: { id: eventId } } },
            });
            periodIdMap.set(inputId, created.id);
          }
        }
        // 4) periods: delete missing
        const incomingPeriodDbIds = Array.from(periodIdMap.values());
        const toDeletePeriods = existingPeriods
          .filter((p) => !incomingPeriodDbIds.includes(p.id))
          .map((p) => p.id);
        if (toDeletePeriods.length) {
          await tx.registrationPeriod.deleteMany({
            where: { id: { in: toDeletePeriods } },
          });
        }

        // 5) pricing tiers: for each period
        for (const p of periods) {
          const inputPeriodId = p.id ?? `__new_period_${periods.indexOf(p)}`;
          const dbPeriodId = periodIdMap.get(inputPeriodId);
          const existingPricing =
            existingPeriods.find((ep) => ep.id === p.id)?.registrationTiers ??
            [];

          // process creates/updates
          const seenPricingIds = [];
          for (const price of p.prices) {
            const inputPriceId =
              price.id ?? `__new_price_${price.tierId}_${dbPeriodId}`;

            const tierDbId = tierIdMap.get(price.tierId);
            const data = {
              registrationPeriodId: dbPeriodId,
              registrationTierId: tierDbId,
              price: price.price,
              available: price.isAvailable,
            };
            if (price.id && isNaN(Number(price.id))) {
              await tx.registrationPeriodPricing.update({
                where: { id: price.id },
                data,
              });
              seenPricingIds.push(price.id);
            } else {
              const created = await tx.registrationPeriodPricing.create({
                data,
              });
              seenPricingIds.push(created.id);
            }
          }
          // delete removed pricing
          const toDeletePricing = existingPricing
            .map((pr) => pr.id)
            .filter((id) => !seenPricingIds.includes(id));
          if (toDeletePricing.length) {
            await tx.registrationPeriodPricing.deleteMany({
              where: { id: { in: toDeletePricing } },
            });
          }
        }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(registrationBuilderSchema));
  },
];
