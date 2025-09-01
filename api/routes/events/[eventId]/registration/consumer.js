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
  selectedTeamId: z.string().optional().nullable(),
  enteredTeamCode: z.string().max(32).optional().nullable(),
});

export const get = [
  async (req, res) => {
    const now = new Date();
    const { eventId } = req.params;

    if (!eventId || eventId === "undefined")
      return res.status(400).json({ message: "No event ID provided" });
    // Prefer explicit instance from header; otherwise fallback to next upcoming
    const instanceId =
      req.instanceId || (await getNextInstance(eventId))?.id || null;

    let tiers = await prisma.registrationTier.findMany({
      where: {
        eventId,
        deleted: false,
        instanceId,
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
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      // Prefer explicit instance from header; otherwise fallback to next upcoming
      const instanceId =
        req.instanceId || (await getNextInstance(eventId))?.id || null;

      const parsed = registrationSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const {
        responses,
        selectedRegistrationTier,
        selectedUpsells,
        selectedTeamId,
        enteredTeamCode,
      } = parsed.data;

      const fieldIds = Object.keys(responses);
      const fieldTypes = await prisma.registrationField.findMany({
        where: { id: { in: fieldIds }, instanceId },
      });

      // TODO: Right now we are just going to trust the data is valid and nothing required is missing.

      // Create a transaction
      const transaction = await prisma.$transaction(
        async (tx) => {
          // 1) Create a new registration
          const selectedPeriodPricing =
            await tx.registrationPeriodPricing.findUnique({
              where: {
                id: selectedRegistrationTier,
                instanceId,
                deleted: false,
              },
            });

          if (!selectedPeriodPricing) {
            throw new Error("Invalid registration tier");
          }

          const registration = await tx.registration.create({
            data: {
              eventId,
              instanceId,
              registrationPeriodPricingId: selectedPeriodPricing.id,
              registrationTierId: selectedPeriodPricing.registrationTierId,
              registrationPeriodId: selectedPeriodPricing.registrationPeriodId,
              priceSnapshot: selectedPeriodPricing.price,
            },
          });

          const inserts = mapInputToInsert(
            responses,
            fieldTypes,
            registration.id,
            instanceId
          );

          await tx.registrationFieldResponse.createMany({
            data: inserts,
          });

          // 3) Connect upsells
          // TODO: Make sure upsells are available before connecting
          const upsells = await tx.upsellItem.findMany({
            where: { id: { in: selectedUpsells }, instanceId, deleted: false },
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

          // 4) If a team was selected or code entered, attempt to join
          if ((selectedTeamId && selectedTeamId.length > 0) || (enteredTeamCode && enteredTeamCode.trim().length > 0)) {
            // Resolve the team: by id must be public; by code can be any team
            let team = null;
            if (selectedTeamId && selectedTeamId.length > 0) {
              team = await tx.team.findFirst({
                where: {
                  id: selectedTeamId,
                  eventId,
                  instanceId,
                  deleted: false,
                  public: true,
                },
              });
              if (!team) throw new Error("Selected team is not available");
            } else if (enteredTeamCode && enteredTeamCode.trim().length > 0) {
              const code = enteredTeamCode.trim();
              team = await tx.team.findFirst({
                where: {
                  code,
                  eventId,
                  instanceId,
                  deleted: false,
                },
              });
              if (!team) throw new Error("Invalid team code");
            }

            // Enforce capacity if applicable (only count finalized regs)
            const memberCount = await tx.registration.count({
              where: { teamId: team.id, instanceId, finalized: true },
            });
            if (team.maxSize != null && memberCount >= team.maxSize) {
              throw new Error("Team is full");
            }

            await tx.registration.update({
              where: { id: registration.id },
              data: { teamId: team.id },
            });
          }

          // 5) Figure out if payment is required
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
                instanceId,
              },
              {
                type: LogType.REGISTRATION_PERIOD_PRICING_SOLD,
                eventId,
                ip: req.ip,
                registrationPeriodPricingId: selectedPeriodPricing.id,
                registrationId: registration.id,
                instanceId,
              },
              ...selectedUpsells.map((u) => ({
                type: LogType.UPSELL_SOLD,
                eventId,
                ip: req.ip,
                upsellItemId: u,
                registrationId: registration.id,
                instanceId,
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
