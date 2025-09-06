import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

// PATCH /api/events/:eventId/sessions/:sessionId
// Attach foreign keys to an existing session
export const patch = [
  async (req, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const instanceId = req.instanceId;
      const { registrationId, volunteerRegistrationId } = req.body || {};

      if (!eventId || !sessionId) {
        return res.status(400).json({ message: "Missing identifiers" });
      }
      if (!instanceId) {
        return res.status(400).json({ message: "Missing X-Instance header" });
      }

      const event = await prisma.event.findFirst({
        where: { OR: [{ id: eventId }, { slug: eventId }] },
        select: { id: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.eventId !== event.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await prisma.session.update({
        where: { id: sessionId },
        data: {
          registrationId: registrationId ?? undefined,
          volunteerRegistrationId: volunteerRegistrationId ?? undefined,
          converted: true,
        },
      });

      return res.json({ session: updated });
    } catch (e) {
      console.error("Session link failed", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId, sessionId } = req.params;
      let instanceId = req.instanceId;
      if (instanceId === "null") instanceId = null;

      if (!eventId || !sessionId) {
        return res.status(400).json({ message: "Missing identifiers" });
      }

      // Resolve event by id or slug for stability
      const event = await prisma.event.findFirst({
        where: { OR: [{ id: eventId }, { slug: eventId }] },
        select: { id: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      // Load session and ensure it belongs to the event (and instance, if provided)
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.eventId !== event.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Gather chunks for this session (ordered) and fetch their JSON payloads
      const chunks = await prisma.sessionChunk.findMany({
        where: { sessionId: session.id },
        include: {
          file: { select: { id: true, location: true, contentType: true } },
        },
        orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
      });

      let events = [];
      try {
        const doFetch =
          globalThis.fetch ?? (await import("node-fetch")).default;
        const payloads = await Promise.all(
          (chunks || []).map(async (c) => {
            if (!c?.file?.location) return null;
            const resp = await doFetch(c.file.location);
            if (!resp?.ok) return null;
            const text = await resp.text();
            try {
              return JSON.parse(text);
            } catch (_) {
              return null;
            }
          })
        );
        for (const p of payloads) {
          if (p && Array.isArray(p.events)) {
            events.push(...p.events);
          }
        }
      } catch (_) {
        console.error("Failed to fetch events from chunks", _);
        return res.status(500).json({ message: "Internal server error" });
      }

      return res.json({
        session,
        chunks: chunks.map((c) => ({
          id: c.id,
          fileId: c.fileId,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
          file: c.file,
        })),
        events,
      });
    } catch (e) {
      console.error("Session get failed", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
