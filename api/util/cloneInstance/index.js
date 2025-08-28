// instanceClone.mjs
// ES modules, named exports, arrow functions. Ready to paste.
// Adjust the prisma import to your aliasing if needed.

import { prisma } from "#prisma";

/* ---------------------------------- Core ---------------------------------- */

export const createInstance = async ({
  eventId,
  name,
  startTime,
  endTime,
  startTimeTz,
  endTimeTz,
}) => {
  const created = await prisma.eventInstance.create({
    data: { eventId, name, startTime, endTime, startTimeTz, endTimeTz },
  });
  return created;
};

export const getTemplateInstance = async (fromInstanceId) => {
  return prisma.eventInstance.findUniqueOrThrow({
    where: { id: fromInstanceId },
    select: {
      id: true,
      eventId: true,
      startTime: true,
      endTime: true,
      startTimeTz: true,
      endTimeTz: true,
    },
  });
};

export const computeDeltaMs = (srcStart, dstStart, enable = true) =>
  enable ? new Date(dstStart).getTime() - new Date(srcStart).getTime() : 0;

export const shiftDate = (date, deltaMs) =>
  deltaMs ? new Date(new Date(date).getTime() + deltaMs) : date;

/* ------------------------- Domain: Locations/Jobs/Shifts ------------------------- */

export const cloneLocationsJobsShifts = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  deltaMs = 0,
  summary,
}) => {
  // maps (oldId -> newId)
  const map = { location: new Map(), job: new Map() };

  const locations = await tx.location.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
    include: {
      jobs: {
        where: { deleted: false },
        include: {
          shifts: { where: { deleted: false } },
        },
      },
      // we won't clone location.shifts directly, since they belong under jobs
    },
  });

  for (const loc of locations) {
    const newLoc = await tx.location.create({
      data: {
        name: loc.name,
        description: loc.description,
        eventId,
        instanceId: toInstanceId,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        startTime: shiftDate(loc.startTime, deltaMs),
        endTime: shiftDate(loc.endTime, deltaMs),
        startTimeTz: loc.startTimeTz,
        endTimeTz: loc.endTimeTz,
      },
    });
    map.location.set(loc.id, newLoc.id);
    summary.locations++;

    for (const job of loc.jobs) {
      const newJob = await tx.job.create({
        data: {
          name: job.name,
          description: job.description,
          restrictions: job.restrictions,
          capacity: job.capacity,
          eventId,
          instanceId: toInstanceId,
          locationId: newLoc.id,
        },
      });
      map.job.set(job.id, newJob.id);
      summary.jobs++;

      for (const s of job.shifts) {
        await tx.shift.create({
          data: {
            eventId,
            instanceId: toInstanceId,
            locationId: newLoc.id,
            jobId: newJob.id,
            startTime: shiftDate(s.startTime, deltaMs),
            endTime: shiftDate(s.endTime, deltaMs),
            startTimeTz: s.startTimeTz,
            endTimeTz: s.endTimeTz,
            capacity: s.capacity,
            open: s.open,
            active: s.active,
          },
        });
        summary.shifts++;
      }
    }
  }

  return map;
};

/* ----------------------------- Domain: Volunteer FormFields ----------------------------- */
/* (Your "volunteer" form system: FormField + FormFieldOption) */

export const cloneVolunteerFormFields = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const fields = await tx.formField.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
    include: { options: true },
  });

  for (const f of fields) {
    const newF = await tx.formField.create({
      data: {
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        description: f.description,
        required: f.required,
        defaultValue: f.defaultValue,
        prompt: f.prompt,
        order: f.order,
        eventpilotFieldType: f.eventpilotFieldType,
        autocompleteType: f.autocompleteType,
        eventId,
        instanceId: toInstanceId,
      },
    });
    summary.formFields++;

    for (const o of f.options) {
      await tx.formFieldOption.create({
        data: {
          fieldId: newF.id,
          label: o.label,
          order: o.order,
        },
      });
      summary.formFieldOptions++;
    }
  }
};

/* -------------------------- Domain: Registration Pages & Fields -------------------------- */

export const cloneRegistrationPagesAndFields = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const pageMap = new Map(); // oldPageId -> newPageId

  const pages = await tx.registrationPage.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
    include: {
      fields: {
        where: { deleted: false },
        include: { options: true },
      },
    },
  });

  for (const page of pages) {
    const newPage = await tx.registrationPage.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: page.name,
        order: page.order,
      },
    });
    pageMap.set(page.id, newPage.id);
    summary.regPages++;

    for (const f of page.fields) {
      const newField = await tx.registrationField.create({
        data: {
          eventId,
          instanceId: toInstanceId,
          pageId: newPage.id,
          label: f.label,
          type: f.type,
          fieldType: f.fieldType,
          required: f.required,
          placeholder: f.placeholder,
          description: f.description,
          prompt: f.prompt,
          rows: f.rows,
          markdown: f.markdown,
          order: f.order,
        },
      });
      summary.regFields++;

      for (const o of f.options) {
        await tx.registrationFieldOption.create({
          data: {
            fieldId: newField.id,
            label: o.label,
            value: o.value,
            order: o.order,
          },
        });
        summary.regFieldOptions++;
      }
    }
  }

  return { pageMap };
};

/* ----------------------- Domain: Registration Periods / Tiers / Pricing ----------------------- */

export const cloneRegistrationPeriods = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  deltaMs = 0,
  summary,
}) => {
  const periodMap = new Map(); // oldPeriodId -> newPeriodId

  const periods = await tx.registrationPeriod.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const p of periods) {
    const newP = await tx.registrationPeriod.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: p.name,
        startTime: shiftDate(p.startTime, deltaMs),
        startTimeTz: p.startTimeTz,
        endTime: shiftDate(p.endTime, deltaMs),
        endTimeTz: p.endTimeTz,
      },
    });
    periodMap.set(p.id, newP.id);
    summary.regPeriods++;
  }

  return { periodMap };
};

export const cloneRegistrationTiers = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const tierMap = new Map(); // oldTierId -> newTierId

  const tiers = await tx.registrationTier.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const t of tiers) {
    const newT = await tx.registrationTier.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: t.name,
        description: t.description,
        capacity: t.capacity,
        order: t.order,
      },
    });
    tierMap.set(t.id, newT.id);
    summary.regTiers++;
  }

  return { tierMap };
};

export const cloneRegistrationPeriodPricing = async ({
  tx,
  fromInstanceId,
  toInstanceId,
  periodMap,
  tierMap,
  summary,
}) => {
  const pricings = await tx.registrationPeriodPricing.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const rp of pricings) {
    const newPeriodId = periodMap.get(rp.registrationPeriodId);
    const newTierId = tierMap.get(rp.registrationTierId);
    if (!newPeriodId || !newTierId) continue;

    await tx.registrationPeriodPricing.create({
      data: {
        eventId: rp.eventId ?? null, // optional in schema
        instanceId: toInstanceId,
        registrationPeriodId: newPeriodId,
        registrationTierId: newTierId,
        price: rp.price,
        available: rp.available,
        // stripe_productId / stripe_priceId intentionally not cloned
      },
    });
    summary.regPeriodPricing++;
  }
};

/* -------------------------------- Domain: Upsell Items -------------------------------- */

export const cloneUpsellItems = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const upsells = await tx.upsellItem.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const u of upsells) {
    await tx.upsellItem.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: u.name,
        description: u.description,
        price: u.price,
        inventory: u.inventory,
        order: u.order,
      },
    });
    summary.upsellItems++;
  }
};

/* --------------------------------- Wrapper / Orchestration --------------------------------- */

export const cloneInstanceFromTemplate = async ({
  eventId,
  fromInstanceId,
  newInstance, // { name, startTime, endTime, startTimeTz, endTimeTz }
  options = {},
}) => {
  const opt = {
    shiftChildrenByInstanceDelta: true,

    cloneLocations: true,
    cloneJobs: true, // implied by cloneLocations
    cloneShifts: true, // implied by cloneJobs
    cloneVolunteerFormFields: true,
    cloneRegistrationForms: true, // pages + fields + options
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

  await prisma.$transaction(async (tx) => {
    // Locations → Jobs → Shifts
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

    // Volunteer form fields (FormField + options)
    if (opt.cloneVolunteerFormFields) {
      await cloneVolunteerFormFields({
        tx,
        eventId,
        fromInstanceId,
        toInstanceId: created.id,
        summary,
      });
    }

    // Registration forms (pages + fields + options)
    if (opt.cloneRegistrationForms) {
      await cloneRegistrationPagesAndFields({
        tx,
        eventId,
        fromInstanceId,
        toInstanceId: created.id,
        summary,
      });
    }

    // Registration periods / tiers / pricing
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

    // Upsell items (no files/stripe IDs)
    if (opt.cloneUpsellItems) {
      await cloneUpsellItems({
        tx,
        eventId,
        fromInstanceId,
        toInstanceId: created.id,
        summary,
      });
    }

    // One summary log
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
  });

  return { instanceId: created.id, summary };
};
