import { verifyAuth } from "#verifyAuth";
import { calculateProgress } from "#calculateProgress";
import { prisma } from "#prisma";

const eventStart = async (eventId) => {
  const shift = await prisma.shift.findFirst({
    where: { eventId },
    orderBy: { startTime: "asc" },
  });

  if (!shift) {
    const location = await prisma.location.findFirst({
      where: { eventId },
      orderBy: { startTime: "asc" },
    });
    if (!location) return null;
    return location.startTime;
  }

  return shift.startTime;
};

const volunteerRegistrationByDay = async (eventId) => {
  const responses = await prisma.formResponse.findMany({
    where: { eventId, deleted: false },
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
    const userId = req.user.id;

    try {
      // Kick off all promises in parallel
      const progressPromise = calculateProgress(eventId, userId);
      const eventStartPromise = eventStart(eventId);
      const shiftCountPromise = prisma.shift.count({
        where: { eventId, deleted: false },
      });
      const locationCountPromise = prisma.location.count({
        where: { eventId, deleted: false },
      });
      const jobCountPromise = prisma.job.count({
        where: { eventId, deleted: false },
      });
      const registrationCountPromise = prisma.formResponse.count({
        where: { eventId, deleted: false },
      });
      const volunteerRegistrationByDayPromise =
        volunteerRegistrationByDay(eventId);

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
        eventStart: eventStart_,
        shiftCount,
        locationCount,
        jobCount,
        volunteerRegistrationCount: registrationCount,
        volunteerRegistrationByDay: vrbDay,
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
