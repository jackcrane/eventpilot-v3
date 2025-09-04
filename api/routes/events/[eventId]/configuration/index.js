import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";

const configurationSchema = z.object({
  remainingStepsOpen: z.boolean().optional(),

  volunteerStatsDisplayFormat: z.enum(["calendar", "timeline"]).optional(),
  volunteerStatsCalendarMetric: z.enum(["count", "change"]).optional(),
  volunteerStatsTimeframe: z.enum(["1", "3", "6"]).optional(),

  participantStatsDisplayFormat: z.enum(["calendar", "timeline"]).optional(),
  participantStatsCalendarMetric: z.enum(["count", "change"]).optional(),
  participantStatsTimeframe: z.enum(["1", "3", "6"]).optional(),
});

async function getEventOr404(req, res) {
  const event = await prisma.event.findFirst({
    where: {
      userId: req.user.id,
      OR: [{ id: req.params.eventId }, { slug: req.params.eventId }],
    },
    select: { id: true },
  });
  if (!event) {
    res.status(404).json({ message: "Event not found" });
    return null;
  }
  return event;
}

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const event = await getEventOr404(req, res);
    if (!event) return;

    const configuration = await prisma.configuration.findUnique({
      where: { eventId: event.id },
    });

    res.json({ configuration });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const event = await getEventOr404(req, res);
    if (!event) return;

    const parsed = configurationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid body" });
    }

    const data = parsed.data;

    const configuration = await prisma.configuration.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, ...data },
      update: { ...data },
    });

    res.json({ configuration });
  },
];

export const patch = put;

export const query = [
  (req, res) => {
    return res.json(zerialize(configurationSchema));
  },
];
