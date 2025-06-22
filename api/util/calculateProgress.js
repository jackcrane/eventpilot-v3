import { prisma } from "#prisma";

export const calculateProgress = async (eventId, userId) => {
  // weights for each step
  const weights = {
    emailVerified: 4,
    goodPaymentStanding: 6,
    volunteerRegistrationForm: 3,
    location: 3,
    job: 3,
    shift: 1,
  };

  // fire off all queries in parallel
  const [user, registrationCount, locationCount, jobCount, shiftCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          emailVerified: true,
          goodPaymentStanding: true,
        },
      }),
      prisma.formField.count({
        where: { eventId, deleted: false },
      }),
      prisma.location.count({
        where: { eventId, deleted: false },
      }),
      prisma.job.count({
        where: { eventId, deleted: false },
      }),
      prisma.shift.count({
        where: { eventId, deleted: false },
      }),
    ]);

  // derive booleans
  const emailVerified = Boolean(user?.emailVerified);
  const goodPaymentStanding = Boolean(user?.goodPaymentStanding);
  const volunteerRegistrationForm = registrationCount > 0;
  const location = locationCount > 0;
  const job = jobCount > 0;
  const shift = shiftCount > 0;

  // calculate total weight achieved
  const progressBuilder = Math.round(
    (((emailVerified ? weights.emailVerified : 0) +
      (goodPaymentStanding ? weights.goodPaymentStanding : 0) +
      (volunteerRegistrationForm ? weights.volunteerRegistrationForm : 0) +
      (location ? weights.location : 0) +
      (job ? weights.job : 0) +
      (shift ? weights.shift : 0)) /
      Object.values(weights).reduce((a, b) => a + b, 0)) *
      100
  );

  return [
    progressBuilder,
    {
      emailVerified,
      goodPaymentStanding,
      volunteerRegistrationForm,
      location,
      job,
      shift,
    },
  ];
};
