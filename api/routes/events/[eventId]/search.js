import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { solrSearch, isSolrConfigured } from "../../../util/search/solrClient.js";

const legacySearch = async (eventId, q) => {
  const filter = { contains: q, mode: "insensitive" };
  const [locations, jobs, shifts, volunteers] = await Promise.all([
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
      },
    }),
    prisma.volunteerRegistration.findMany({
      where: { eventId, deleted: false },
      include: {
        fieldResponses: { where: { value: filter } },
      },
    }),
  ]);

  return [
    ...locations.map((record) => ({
      model: "location",
      resourceType: "location",
      resourceKind: "Location",
      resourceId: record.id,
      title: record.name,
      description: record.description,
      score: 0,
    })),
    ...jobs.map((record) => ({
      model: "job",
      resourceType: "job",
      resourceKind: "Job",
      resourceId: record.id,
      title: record.name,
      description: record.description,
      score: 0,
    })),
    ...shifts.map((record) => ({
      model: "shift",
      resourceType: "shift",
      resourceKind: "Shift",
      resourceId: record.id,
      title: record.id,
      description: "",
      score: 0,
    })),
    ...volunteers
      .filter((response) => response.fieldResponses?.length > 0)
      .map((record) => ({
        model: "volunteer",
        resourceType: "volunteer",
        resourceKind: "Volunteer",
        resourceId: record.id,
        title: record.id,
        description: "",
        score: 0,
      })),
  ];
};

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const eventId = req.params.eventId;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!q) {
      return res.json([]);
    }

    if (!isSolrConfigured()) {
      const fallbackResults = await legacySearch(eventId, q);
      return res.json(fallbackResults);
    }

    try {
      const { docs } = await solrSearch({ query: q, eventId, rows: 50 });
      const results = docs.map((doc) => ({
        model: doc.resourceType,
        resourceType: doc.resourceType,
        resourceKind: doc.resourceKind ?? doc.resourceType,
        resourceId: doc.resourceId,
        title: doc.title,
        subtitle: doc.subtitle,
        description: doc.description,
        score: doc.score ?? 0,
      }));
      return res.json(results);
    } catch (error) {
      console.error(`[search] Failed to query SOLR`, error);
      const fallbackResults = await legacySearch(eventId, q);
      return res.json(fallbackResults);
    }
  },
];
