import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { getNextInstance } from "#util/getNextInstance";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { zerialize } from "zodex";
import { cloneInstanceFromTemplate } from "#util/cloneInstance/cloneInstanceFromTemplate.js";
import { captureApiEvent, identifyApiGroup } from "#util/posthog.js";

export const instanceSchema = z.object({
  name: z.string().min(2).max(50),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  startTimeTz: z.string(),
  endTimeTz: z.string(),
  templateInstanceId: z.string().optional().nullable(),

  locationJobsShifts: z.boolean().default(false).optional(),
  formField: z.boolean().default(false).optional(),
  registrationTier: z.boolean().default(false).optional(),
  registrationPeriod: z.boolean().default(false).optional(),
  registrationPeriodPricing: z.boolean().default(false).optional(),
  upsellItem: z.boolean().default(false).optional(),
  registration: z.boolean().default(false).optional(),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const now = new Date();

    const instances = await prisma.eventInstance.findMany({
      where: { eventId, deleted: false },
    });

    const nextInstance = await getNextInstance(eventId);

    const annotated = instances.map((i) => ({
      ...i,
      active:
        i.startTime.getTime() < now.getTime() &&
        i.endTime.getTime() > now.getTime(),
      isNext: nextInstance ? i.id === nextInstance.id : false,
    }));

    res.json({ instances: annotated });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const parsed = instanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }

    console.log(parsed.data);

    const instance = await prisma.eventInstance.create({
      data: {
        eventId,
        name: parsed.data.name,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        startTimeTz: parsed.data.startTimeTz,
        endTimeTz: parsed.data.endTimeTz,
      },
    });

    if (parsed.data.templateInstanceId) {
      const cloneOp = await cloneInstanceFromTemplate({
        eventId,
        fromInstanceId: parsed.data.templateInstanceId,
        newInstance: instance,
        options: {
          shiftChildrenByInstanceDelta: true,
          cloneLocations: parsed.data.locationJobsShifts,
          cloneJobs: parsed.data.locationJobsShifts,
          cloneShifts: parsed.data.locationJobsShifts,
          cloneVolunteerFormFields: parsed.data.formField,
          cloneRegistrationForms: parsed.data.registration,
          cloneRegistrationPeriods: parsed.data.registrationPeriod,
          cloneRegistrationTiers: parsed.data.registrationTier,
          cloneRegistrationPeriodPricing: parsed.data.registrationPeriodPricing,
          cloneUpsellItems: parsed.data.upsellItem,
        },
      });

      console.log(cloneOp);
    }

    await identifyApiGroup(req, {
      eventId,
      instanceId: instance.id,
      instanceProperties: {
        instance_name: instance.name,
      },
    });
    await captureApiEvent(
      req,
      "api_instance_created",
      {
        instance_id: instance.id,
        instance_name: instance.name,
        template_instance_id: parsed.data.templateInstanceId,
        cloned_sections: [
          parsed.data.locationJobsShifts && "location_jobs_shifts",
          parsed.data.formField && "form_field",
          parsed.data.registration && "registration",
          parsed.data.registrationPeriod && "registration_period",
          parsed.data.registrationTier && "registration_tier",
          parsed.data.registrationPeriodPricing &&
            "registration_period_pricing",
          parsed.data.upsellItem && "upsell_item",
        ].filter(Boolean),
      },
      { eventId, instanceId: instance.id, identifyGroup: true }
    );

    res.json({ instance });
    // res.json({ message: "Not implemented" });
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(instanceSchema));
  },
];
