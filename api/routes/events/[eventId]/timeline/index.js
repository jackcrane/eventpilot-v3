import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

const getRegistrationPeriodChangeovers = async (eventId) => {
  const periods = await prisma.registrationPeriod.findMany({
    where: { eventId },
  });

  const sorted = [...periods].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );
  const events = [];
  if (sorted.length === 0) return events;

  // discrete “starts” for first period
  const first = sorted[0];
  events.push({
    type: "period.discrete",
    action: "starts",
    periodId: first.id,
    periodName: first.name,
    timestamp: first.startTime,
    timestampTz: first.startTimeTz,
  });

  // changeovers between each adjacent pair
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    events.push({
      type: "period.changeover",
      fromPeriodId: prev.id,
      fromPeriodName: prev.name,
      toPeriod: curr.id,
      toPeriodName: curr.name,
      timestamp: curr.startTime,
      timestampTz: curr.startTimeTz,
    });
  }

  // discrete “ends” for last period
  const last = sorted[sorted.length - 1];
  events.push({
    type: "period.discrete",
    action: "ends",
    periodId: last.id,
    periodName: last.name,
    timestamp: last.endTime,
    timestampTz: last.endTimeTz,
  });

  return events;
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const periods = await getRegistrationPeriodChangeovers(eventId);
      const events = [...periods].sort((a, b) => a.timestamp - b.timestamp);

      res.json({ events });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      res.status(500).json({ error });
    }
  },
];
