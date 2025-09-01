import { prisma } from "#prisma";

export const calculateProgress = async (eventId, instanceId) => {
  // weights for each step shown in the event dash
  const weights = {
    volunteerRegistrationForm: 3,
    registrationForm: 3,
    location: 3,
    job: 3,
    shift: 1,
    upsells: 2,
    tiersPeriods: 3,
  };

  // fire off all queries in parallel
  const [
    volunteerFieldCount,
    locationCount,
    jobCount,
    shiftCount,
    registrationFieldCount,
    upsellCount,
    tierCount,
    periodCount,
  ] = await Promise.all([
    // volunteer form fields
    prisma.volunteerRegistrationField.count({
      where: { eventId, instanceId, deleted: false },
    }),
    // locations
    prisma.location.count({
      where: { eventId, instanceId, deleted: false },
    }),
    // jobs
    prisma.job.count({
      where: { eventId, instanceId, deleted: false },
    }),
    // shifts
    prisma.shift.count({
      where: { eventId, instanceId, deleted: false },
    }),
    // registration form fields (exclude special/meta types)
    prisma.registrationField.count({
      where: {
        eventId,
        instanceId,
        deleted: false,
        page: { deleted: false },
        type: { notIn: ["UPSELLS", "REGISTRATIONTIER", "RICHTEXT"] },
      },
    }),
    // upsell items
    prisma.upsellItem.count({
      where: { eventId, instanceId, deleted: false },
    }),
    // tiers
    prisma.registrationTier.count({
      where: { eventId, instanceId, deleted: false },
    }),
    // periods
    prisma.registrationPeriod.count({
      where: { eventId, instanceId, deleted: false },
    }),
  ]);

  // derive booleans
  const steps = {
    volunteerRegistrationForm: volunteerFieldCount > 0,
    registrationForm: registrationFieldCount > 0,
    location: locationCount > 0,
    job: jobCount > 0,
    shift: shiftCount > 0,
    upsells: upsellCount > 0,
    tiersPeriods: tierCount > 0 && periodCount > 0,
  };

  // calculate weighted percentage based on defined weights for these steps
  const achieved = Object.entries(steps).reduce(
    (sum, [k, v]) => sum + (v ? weights[k] : 0),
    0
  );
  const total = Object.keys(steps).reduce((sum, k) => sum + weights[k], 0);
  const progressBuilder = Math.round((achieved / total) * 100);

  return [progressBuilder, steps];
};
