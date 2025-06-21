import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const eventId = req.params.eventId;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!q) {
      return res.json([]);
    }

    const filter = { contains: q, mode: "insensitive" };

    const [locations, jobs, shifts, formResponses] = await Promise.all([
      prisma.location.findMany({
        where: {
          eventId,
          OR: [
            { name: filter },
            { description: filter },
            { address: filter },
            { city: filter },
            { state: filter },
          ],
          deleted: false,
        },
      }),
      prisma.job.findMany({
        where: {
          eventId,
          OR: [{ name: filter }, { description: filter }],
          deleted: false,
        },
      }),
      prisma.shift.findMany({
        where: {
          eventId,
          OR: [
            // you can add searchable columns here if needed
          ],
          deleted: false,
        },
      }),
      prisma.formResponse.findMany({
        where: { eventId, deleted: false },
        include: {
          fieldResponses: {
            where: { value: filter },
          },
        },
      }),
    ]);

    const results = [
      ...locations.map((r) => ({ model: "Location", data: r })),
      ...jobs.map((r) => ({ model: "Job", data: r })),
      ...shifts.map((r) => ({ model: "Shift", data: r })),
      ...formResponses
        .filter((r) => r.fieldResponses.length > 0)
        .map((r) => ({ model: "FormResponse", data: r })),
    ];

    return res.json(results);
  },
];
