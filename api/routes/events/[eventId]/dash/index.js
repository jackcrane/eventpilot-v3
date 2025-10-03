import { verifyAuth } from "#verifyAuth";
import { calculateProgress } from "#calculateProgress";
import { prisma } from "#prisma";
import { reportApiError } from "#util/reportApiError.js";

const eventStart = async (eventId, instanceId) => {
  const shift = await prisma.shift.findFirst({
    where: { eventId, instanceId },
    orderBy: { startTime: "asc" },
  });

  if (!shift) {
    const location = await prisma.location.findFirst({
      where: { eventId, instanceId },
      orderBy: { startTime: "asc" },
    });
    if (!location) return null;
    return location.startTime;
  }

  return shift.startTime;
};

const volunteerRegistrationByDay = async (eventId, instanceId) => {
  const responses = await prisma.volunteerRegistration.findMany({
    where: { eventId, instanceId, deleted: false },
  });

  const countMap = {};
  responses.forEach((r) => {
    const day = r.createdAt.toISOString().slice(0, 10);
    if (!countMap[day]) countMap[day] = 0;
    countMap[day]++;
  });

  return Object.entries(countMap)
    .map(([date, qty]) => ({ date, qty }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
      // Kick off all promises in parallel
      const progressPromise = calculateProgress(eventId, instanceId);
      const eventStartPromise = eventStart(eventId, instanceId);
      const shiftCountPromise = prisma.shift.count({
        where: { eventId, instanceId, deleted: false },
      });
      const locationCountPromise = prisma.location.count({
        where: { eventId, instanceId, deleted: false },
      });
      const jobCountPromise = prisma.job.count({
        where: { eventId, instanceId, deleted: false },
      });
      const registrationCountPromise = prisma.volunteerRegistration.count({
        where: { eventId, instanceId, deleted: false },
      });
      const volunteerRegistrationByDayPromise = volunteerRegistrationByDay(
        eventId,
        instanceId
      );

      // Await all at once
      const [
        [percent, steps],
        eventStart_,
        shiftCount,
        locationCount,
        jobCount,
        registrationCount,
        vrbDay,
      ] = await Promise.all([
        progressPromise,
        eventStartPromise,
        shiftCountPromise,
        locationCountPromise,
        jobCountPromise,
        registrationCountPromise,
        volunteerRegistrationByDayPromise,
      ]);

      res.json({
        progress: {
          percent,
          steps,
          completedSteps: Object.values(steps).filter((v) => v).length,
          totalSteps: Object.values(steps).length,
        },
        volunteerRegistrationEnabled:
          steps.volunteerRegistrationForm &&
          steps.location &&
          steps.job &&
          steps.shift,
        registrationEnabled: steps.registrationForm && steps.tiersPeriods,
        eventStart: eventStart_,
        shiftCount,
        locationCount,
        jobCount,
        volunteerRegistrationCount: registrationCount,
        volunteerRegistrationByDay: vrbDay,
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId:", error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
