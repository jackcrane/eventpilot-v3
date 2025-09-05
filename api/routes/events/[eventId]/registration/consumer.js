import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { mapInputToInsert } from "./fragments/consumer/mapInputToInsert";
import { LogType } from "@prisma/client";
import { registrationRequiresPayment } from "./fragments/consumer/registrationRequiresPayment";
import { finalizeRegistration } from "../../../../util/finalizeRegistration";
import { createLedgerItemForRegistration } from "../../../../util/ledger";
import { getNextInstance } from "#util/getNextInstance.js";

const registrationSubmissionSchema = z.object({
  responses: z.record(z.string(), z.any()),
  selectedRegistrationTier: z.string(),
  selectedUpsells: z.array(z.string()),
  selectedTeamId: z.string().optional().nullable(),
  enteredTeamCode: z.string().max(32).optional().nullable(),
  couponCode: z.string().max(32).optional().nullable(),
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

    // Fetch event for payouts status
    const event = await prisma.event.findUnique({ where: { id: eventId } });

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

    // Determine if payouts (Stripe) are fully configured
    let payoutsEnabled = false;
    try {
      if (event?.stripeConnectedAccountId) {
        const acct = await stripe.accounts.retrieve(
          event.stripeConnectedAccountId
        );
        payoutsEnabled = !!acct?.details_submitted;
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      payoutsEnabled = false;
    }

    res.json({ tiers, payoutsEnabled });
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
        couponCode,
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

          // 2b) Link this registration to a CRM person immediately upon submission
          if (participantEmail) {
            let existingCrmPerson = await tx.crmPerson.findFirst({
              where: {
                eventId,
                deleted: false,
                emails: { some: { email: participantEmail } },
              },
              select: { id: true },
            });

            if (!existingCrmPerson) {
              existingCrmPerson = await tx.crmPerson.create({
                data: {
                  name: participantName || "Participant",
                  source: "REGISTRATION",
                  eventId,
                  emails: { create: { email: participantEmail } },
                  registrations: { connect: { id: registration.id } },
                },
                select: { id: true },
              });
            } else {
              await tx.crmPerson.update({
                where: { id: existingCrmPerson.id },
                data: {
                  registrations: { connect: { id: registration.id } },
                },
              });
            }
          }

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
          if (
            (selectedTeamId && selectedTeamId.length > 0) ||
            (enteredTeamCode && enteredTeamCode.trim().length > 0)
          ) {
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
          // Coupon: validate and attach if present
          let coupon = null;
          if (couponCode && couponCode.trim().length > 0) {
            const now = new Date();
            const code = couponCode.trim();
            const found = await tx.coupon.findFirst({
              where: {
                code,
                eventId,
                instanceId,
                deleted: false,
              },
            });

            if (!found) throw new Error("Invalid coupon code");
            if (found.endsAt && new Date(found.endsAt) < now)
              throw new Error("Coupon has expired");

            if (found.maxRedemptions !== -1) {
              const used = await tx.registration.count({
                where: { couponId: found.id, deleted: false, finalized: true },
              });
              if (used >= found.maxRedemptions)
                throw new Error("Coupon has reached its redemption limit");
            }

            coupon = found;

            // Attach to registration for auditing
            await tx.registration.update({
              where: { id: registration.id },
              data: { couponId: found.id },
            });
          }

          // Derive participant name/email from incoming responses (avoids DB reads inside tx)
          const nameFieldId = fieldTypes.find(
            (f) => f.fieldType === "participantName"
          )?.id;
          const emailFieldId = fieldTypes.find(
            (f) => f.fieldType === "participantEmail"
          )?.id;
          const participantName = nameFieldId ? responses[nameFieldId] : null;
          const participantEmail = emailFieldId
            ? responses[emailFieldId]
            : null;

          const [requiresPayment, stripePIClientSecret, price] =
            await registrationRequiresPayment(
              upsells,
              selectedPeriodPricing,
              event,
              registration.id,
              instanceId,
              coupon,
              participantName,
              participantEmail
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

      const { requiresPayment, registrationId, price } = transaction;

      if (!requiresPayment) {
        const { crmPersonId } = await finalizeRegistration({
          registrationId: registrationId,
          eventId,
          amount: typeof price === "number" ? price : 0,
          instanceId,
        });
        if (typeof price === "number" && price > 0) {
          await createLedgerItemForRegistration({
            eventId,
            instanceId,
            registrationId: registrationId,
            amount: price,
            crmPersonId,
          });
        }
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
