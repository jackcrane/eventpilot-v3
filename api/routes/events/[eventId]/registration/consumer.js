import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { mapInputToInsert } from "./fragments/consumer/mapInputToInsert";
import { LogType } from "@prisma/client";
import { registrationRequiresPayment } from "./fragments/consumer/registrationRequiresPayment";
import { finalizeRegistration } from "../../../../util/finalizeRegistration";
import { getNextInstance } from "#util/getNextInstance.js";

const registrationSubmissionSchema = z.object({
  responses: z.record(z.string(), z.any()),
  selectedRegistrationTier: z.string(),
  selectedUpsells: z.array(z.string()),
});

export const get = [
  async (req, res) => {
    const now = new Date();
    const { eventId } = req.params;

    let tiers = await prisma.registrationTier.findMany({
      where: {
        eventId,
        deleted: false,
      },
      include: {
        pricingTiers: {
          where: {
            deleted: false,
            registrationPeriod: {
              startTime: {
                lte: now,
              },
              endTime: {
                gte: now,
              },
            },
          },
          include: {
            registrationPeriod: {
              select: {
                endTime: true,
                endTimeTz: true,
                name: true,
              },
            },
          },
        },
      },
    });

    tiers = tiers.map((t) => {
      const tier = t.pricingTiers[0];
      const disabled = tier === undefined || tier.available === false;
      return {
        ...t,
        period: disabled
          ? null
          : {
              ...tier,
              ...tier.registrationPeriod,
              registrationPeriod: undefined,
            },
        pricingTiers: undefined,
        disabled,
      };
    });

    res.json({ tiers });
  },
];

export const post = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const parsed = registrationSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const { responses, selectedRegistrationTier, selectedUpsells } =
        parsed.data;

      const fieldIds = Object.keys(responses);
      const fieldTypes = await prisma.registrationField.findMany({
        where: { id: { in: fieldIds } },
      });

      // TODO: Right now we are just going to trust the data is valid and nothing required is missing.

      // Create a transaction
      const transaction = await prisma.$transaction(
        async (tx) => {
          // 1) Create a new registration
          const selectedPeriodPricing =
            await tx.registrationPeriodPricing.findUnique({
              where: { id: selectedRegistrationTier },
            });

          if (!selectedPeriodPricing) {
            throw new Error("Invalid registration tier");
          }

          const registration = await tx.registration.create({
            data: {
              eventId,
              registrationPeriodPricingId: selectedPeriodPricing.id,
              registrationTierId: selectedPeriodPricing.registrationTierId,
              registrationPeriodId: selectedPeriodPricing.registrationPeriodId,
              priceSnapshot: selectedPeriodPricing.price,
            },
          });

          const inserts = mapInputToInsert(
            responses,
            fieldTypes,
            registration.id
          );

          await tx.registrationFieldResponse.createMany({
            data: inserts,
          });

          // 3) Connect upsells
          // TODO: Make sure upsells are available before connecting
          const upsells = await tx.upsellItem.findMany({
            where: { id: { in: selectedUpsells } },
          });

          if (upsells.length !== selectedUpsells.length) {
            throw new Error("Invalid upsells");
          }

          await tx.registrationUpsell.createMany({
            data: selectedUpsells.map((upsellItemId) => ({
              registrationId: registration.id,
              upsellItemId,
              quantity: 1,
              priceSnapshot: upsells.find((u) => u.id === upsellItemId).price,
            })),
            skipDuplicates: true, // optional: avoids error if already exists
          });

          const event = await tx.event.findUnique({ where: { id: eventId } });

          const instance = await getNextInstance(eventId);
          const instanceId = instance.id;

          // 4) Figure out if payment is required
          const [requiresPayment, stripePIClientSecret, price] =
            await registrationRequiresPayment(
              upsells,
              selectedPeriodPricing,
              event,
              registration.id,
              instanceId
            );

          if (!requiresPayment) {
            return { requiresPayment: false, registrationId: registration.id };
          }

          const fullRegistration = await tx.registration.findUnique({
            where: { id: registration.id },
            include: {
              registrationTier: true,
              upsells: true,
              fieldResponses: true,
            },
          });

          await tx.logs.createMany({
            data: [
              {
                type: LogType.REGISTRATION_CREATED,
                eventId,
                ip: req.ip,
                data: JSON.stringify(fullRegistration),
                registrationId: registration.id,
              },
              {
                type: LogType.REGISTRATION_PERIOD_PRICING_SOLD,
                eventId,
                ip: req.ip,
                registrationPeriodPricingId: selectedPeriodPricing.id,
                registrationId: registration.id,
              },
              ...selectedUpsells.map((u) => ({
                type: LogType.UPSELL_SOLD,
                eventId,
                ip: req.ip,
                upsellItemId: u,
                registrationId: registration.id,
              })),
            ],
          });

          return {
            registration: fullRegistration,
            stripePIClientSecret,
            requiresPayment,
            price,
          };
        },
        {
          timeout: 120_000,
          maxWait: 30_000,
        }
      );

      const { requiresPayment, registrationId } = transaction;

      if (!requiresPayment) {
        await finalizeRegistration({
          registrationId: registrationId,
          eventId,
        });
        const registration = await prisma.registration.findUnique({
          where: { id: registrationId },
          include: {
            registrationTier: true,
            upsells: true,
            fieldResponses: true,
          },
        });

        return res.json({
          registration: {
            ...registration,
            ...transaction,
          },
        });
      }

      return res.json({
        registration: transaction,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error });
    }
  },
];
