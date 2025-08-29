import { prisma } from "#prisma";
import { computeDeltaMs } from "./helpers.js";
import { createInstance } from "./createInstance.js";
import { getTemplateInstance } from "./getTemplateInstance.js";
import { cloneLocationsJobsShifts } from "./cloneLocationsJobsShifts.js";
import { cloneVolunteerFormFields } from "./cloneVolunteerFormFields.js";
import { cloneRegistrationPagesAndFields } from "./cloneRegistrationPagesAndFields.js";
import { cloneRegistrationPeriods } from "./cloneRegistrationPeriods.js";
import { cloneRegistrationTiers } from "./cloneRegistrationTiers.js";
import { cloneRegistrationPeriodPricing } from "./cloneRegistrationPeriodPricing.js";
import { cloneUpsellItems } from "./cloneUpsellItems.js";

export const cloneInstanceFromTemplate = async ({
  eventId,
  fromInstanceId,
  newInstance,
  options = {},
}) => {
  const opt = {
    shiftChildrenByInstanceDelta: true,

    cloneLocations: true,
    cloneJobs: true,
    cloneShifts: true,
    cloneVolunteerFormFields: true,
    cloneRegistrationForms: true,
    cloneRegistrationPeriods: true,
    cloneRegistrationTiers: true,
    cloneRegistrationPeriodPricing: true,
    cloneUpsellItems: true,

    ...options,
  };

  const template = await getTemplateInstance(fromInstanceId);
  if (template.eventId !== eventId) {
    throw new Error("fromInstanceId does not belong to provided eventId");
  }

  const deltaMs = computeDeltaMs(
    template.startTime,
    newInstance.startTime,
    opt.shiftChildrenByInstanceDelta
  );

  const created = await createInstance({
    eventId,
    ...newInstance,
  });

  const summary = {
    locations: 0,
    jobs: 0,
    shifts: 0,
    formFields: 0,
    formFieldOptions: 0,
    regPages: 0,
    regFields: 0,
    regFieldOptions: 0,
    regPeriods: 0,
    regTiers: 0,
    regPeriodPricing: 0,
    upsellItems: 0,
  };

  await prisma.$transaction(
    async (tx) => {
      if (opt.cloneLocations || opt.cloneJobs || opt.cloneShifts) {
        await cloneLocationsJobsShifts({
          tx,
          eventId,
          fromInstanceId,
          toInstanceId: created.id,
          deltaMs,
          summary,
        });
      }

      if (opt.cloneVolunteerFormFields) {
        await cloneVolunteerFormFields({
          tx,
          eventId,
          fromInstanceId,
          toInstanceId: created.id,
          summary,
        });
      }

      if (opt.cloneRegistrationForms) {
        await cloneRegistrationPagesAndFields({
          tx,
          eventId,
          fromInstanceId,
          toInstanceId: created.id,
          summary,
        });
      }

      let periodMap, tierMap;
      if (opt.cloneRegistrationPeriods) {
        ({ periodMap } = await cloneRegistrationPeriods({
          tx,
          eventId,
          fromInstanceId,
          toInstanceId: created.id,
          deltaMs,
          summary,
        }));
      }
      if (opt.cloneRegistrationTiers) {
        ({ tierMap } = await cloneRegistrationTiers({
          tx,
          eventId,
          fromInstanceId,
          toInstanceId: created.id,
          summary,
        }));
      }
      if (opt.cloneRegistrationPeriodPricing && periodMap && tierMap) {
        await cloneRegistrationPeriodPricing({
          tx,
          fromInstanceId,
          toInstanceId: created.id,
          periodMap,
          tierMap,
          summary,
        });
      }

      if (opt.cloneUpsellItems) {
        await cloneUpsellItems({
          tx,
          eventId,
          fromInstanceId,
          toInstanceId: created.id,
          summary,
        });
      }

      await tx.logs.create({
        data: {
          eventId,
          instanceId: created.id,
          type: "INSTANCE_CREATED",
          data: {
            clonedFromInstanceId: fromInstanceId,
            summary,
            shiftMs: deltaMs,
          },
        },
      });
    },
    {
      timeout: 30_000,
      maxWait: 10_000,
    }
  );

  return { instanceId: created.id, summary };
};
