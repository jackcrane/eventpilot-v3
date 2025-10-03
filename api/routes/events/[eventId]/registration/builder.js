import { z } from "zod";
import { verifyAuth } from "#verifyAuth";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";
import { prisma } from "#prisma";
import { reportApiError } from "#util/reportApiError.js";
import {
  deleteMissingPeriods,
  deleteMissingTiers,
  syncPricingForPeriods,
  upsertPeriods,
  upsertTiers,
} from "./fragments/builder";

export const registrationBuilderSchema = z.object({
  tiers: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(2),
        description: z.string().optional(),
      })
    )
    .min(1),
  periods: z.array(
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
  ),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const instanceId = req.instanceId;
      console.log(instanceId);

      const [tiers, periodsRaw] = await Promise.all([
        prisma.registrationTier.findMany({
          where: {
            eventId,
            deleted: false,
            instanceId,
          },
          orderBy: { order: "asc" },
        }),
        prisma.registrationPeriod.findMany({
          where: {
            eventId,
            deleted: false,
            instanceId,
          },
          orderBy: { startTime: "asc" },
          include: { registrationTiers: true },
        }),
      ]);

      // shape response
      const tiersOut = tiers.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
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
      reportApiError(error, req);
      return res.status(500).json({ error });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const instanceId = req.instanceId;

      const parsed = registrationBuilderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const { tiers, periods } = parsed.data;
      const { eventId } = req.params;
      const event = await prisma.event.findUnique({ where: { id: eventId } });

      const existingTiers = await prisma.registrationTier.findMany({
        where: { eventId, instanceId, deleted: false },
      });
      const existingPeriods = await prisma.registrationPeriod.findMany({
        where: { eventId, instanceId, deleted: false },
        include: { registrationTiers: true },
      });

      await prisma.$transaction(
        async (tx) => {
          const tierMap = await upsertTiers(tx, tiers, eventId, instanceId);
          await deleteMissingTiers(
            tx,
            existingTiers,
            Array.from(tierMap.values())
          );

          const periodMap = await upsertPeriods(
            tx,
            periods,
            eventId,
            instanceId
          );
          await deleteMissingPeriods(
            tx,
            existingPeriods,
            Array.from(periodMap.values()),
            event
          );

          await syncPricingForPeriods(
            tx,
            periods,
            tiers,
            tierMap,
            periodMap,
            existingPeriods,
            event,
            instanceId
          );
        },
        {
          timeout: 120_000,
          maxWait: 30_000,
        }
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      return res.status(500).json({ error });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(registrationBuilderSchema));
  },
];
