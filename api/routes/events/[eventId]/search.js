import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { solrSearch, isSolrConfigured } from "../../../util/search/solrClient.js";

const stripHtml = (value = "") =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildEmailResult = (record, direction) => {
  const isInbound = direction === "inbound";
  const subject = record.subject || null;
  const subtitle = isInbound
    ? record.from?.email || record.from?.name
    : record.to;
  const title =
    subject ||
    subtitle ||
    (isInbound ? "Inbox Email" : "Sent Email");
  const description =
    (isInbound
      ? record.strippedTextReply || record.textBody || stripHtml(record.htmlBody)
      : record.textBody || stripHtml(record.htmlBody)) || null;

  return {
    model: isInbound ? "inboundEmail" : "email",
    resourceType: "email",
    resourceKind: isInbound ? "Inbox Email" : "Sent Email",
    resourceId: record.id,
    instanceId: null,
    title,
    subtitle: subtitle || null,
    description,
    score: 0,
    conversationId: record.conversationId ?? null,
  };
};

const legacySearch = async (eventId, q) => {
  const filter = { contains: q, mode: "insensitive" };
  const [
    locations,
    jobs,
    shifts,
    volunteers,
    inboundEmails,
    outboundEmails,
  ] = await Promise.all([
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
    prisma.inboundEmail.findMany({
      where: {
        eventId,
        OR: [
          { subject: filter },
          { textBody: filter },
          { htmlBody: filter },
          { strippedTextReply: filter },
          { from: { is: { email: filter } } },
          { from: { is: { name: filter } } },
        ],
      },
      include: {
        from: true,
      },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
    prisma.email.findMany({
      where: {
        conversation: { is: { eventId } },
        OR: [
          { subject: filter },
          { textBody: filter },
          { htmlBody: filter },
          { from: filter },
          { to: filter },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return [
    ...locations.map((record) => ({
      model: "location",
      resourceType: "location",
      resourceKind: "Location",
      resourceId: record.id,
      instanceId: record.instanceId ?? null,
      title: record.name,
      description: record.description,
      score: 0,
    })),
    ...jobs.map((record) => ({
      model: "job",
      resourceType: "job",
      resourceKind: "Job",
      resourceId: record.id,
      instanceId: record.instanceId ?? null,
      title: record.name,
      description: record.description,
      score: 0,
    })),
    ...shifts.map((record) => ({
      model: "shift",
      resourceType: "shift",
      resourceKind: "Shift",
      resourceId: record.id,
      instanceId: record.instanceId ?? null,
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
        instanceId: record.instanceId ?? null,
        title: record.id,
        description: "",
        score: 0,
      })),
    ...inboundEmails.map((record) => buildEmailResult(record, "inbound")),
    ...outboundEmails.map((record) => buildEmailResult(record, "outbound")),
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
        instanceId: doc.instanceId ?? null,
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
