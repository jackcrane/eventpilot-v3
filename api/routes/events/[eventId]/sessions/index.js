import { prisma } from "#prisma";
import { uploadFile } from "#file";
import { getGeolocation } from "#geolocation";

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [k, v] = part.trim().split("=");
    if (!k) return acc;
    acc[k] = decodeURIComponent(v || "");
    return acc;
  }, {});
}

function setSessionCookie(res, sessionId) {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const cookie = `ep_sessionId=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`;
  res.setHeader("Set-Cookie", cookie);
}

// POST /api/events/:eventId/sessions
// - If body has no events: open a new session row and return its id
// - If body has events: finalize the given sessionId (or create+finalize if missing)
export const post = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      let instanceId = req.instanceId;
      if (instanceId === "null") instanceId = null;
      const { events, meta = {}, sessionId, reason } = req.body || {};

      if (!eventId) {
        return res.status(400).json({ message: "Missing eventId" });
      }

      const event = await prisma.event.findFirst({
        where: { OR: [{ id: eventId }, { slug: eventId }] },
        select: { id: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      // Open/resume only: create or reactivate a session row for this visit
      if (!Array.isArray(events)) {
        const cookies = parseCookies(req.headers.cookie);
        const sid = cookies?.ep_sessionId || sessionId || null;
        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
        let geoId = null;
        try {
          const location = await getGeolocation(ip);
          if (location) {
            const geo = await prisma.geolocation.findFirst({ where: { ip } });
            geoId = geo?.id || null;
          }
          // eslint-disable-next-line
        } catch (_) {}

        let session = null;
        if (sid) {
          session = await prisma.session.findUnique({ where: { id: sid } });
          if (
            session &&
            session.eventId === event.id &&
            session.instanceId === instanceId
          ) {
            session = await prisma.session.update({
              where: { id: sid },
              data: {
                active: true,
                path: meta?.path || session.path,
                pageType: meta?.pageType || session.pageType,
                metadata:
                  meta && Object.keys(meta).length ? meta : session.metadata,
                ip: session.ip || ip || null,
                geolocation: geoId ? { connect: { id: geoId } } : null,
                startedAt:
                  session.startedAt ??
                  (meta?.startedAt ? new Date(meta.startedAt) : new Date()),
              },
            });
            setSessionCookie(res, session.id);
            return res.json({ session });
          }
        }

        // Create a fresh session
        session = await prisma.session.create({
          data: {
            event: { connect: { id: event.id } },
            instance: instanceId ? { connect: { id: instanceId } } : undefined,
            path: meta?.path || null,
            pageType: meta?.pageType || null,
            metadata: meta || {},
            active: true,
            ip: ip || null,
            geolocation: geoId ? { connect: { id: geoId } } : undefined,
            startedAt: meta?.startedAt ? new Date(meta.startedAt) : new Date(),
          },
        });
        setSessionCookie(res, session.id);
        return res.json({ session });
      }

      if (events.length === 0) {
        return res.status(400).json({ message: "No events to record" });
      }

      const jsonString = JSON.stringify({ events, meta });
      const base64 = Buffer.from(jsonString).toString("base64");

      // Store the rrweb session JSON as a file in S3
      const uploaded = await uploadFile({
        file: base64,
        name: `rrweb-session-${Date.now()}.json`,
        contentType: "application/json",
        contentLength: Buffer.byteLength(jsonString),
      });

      const cookies = parseCookies(req.headers.cookie);
      const sid = cookies?.ep_sessionId || sessionId || null;
      let session = null;
      if (sid) {
        session = await prisma.session.findUnique({ where: { id: sid } });
      }
      if (!session) {
        session = await prisma.session.create({
          data: {
            eventId: event.id,
            instanceId,
            path: meta?.path || null,
            pageType: meta?.pageType || null,
            metadata: meta || {},
            active: true,
            startedAt: meta?.startedAt ? new Date(meta.startedAt) : new Date(),
          },
        });
        setSessionCookie(res, session.id);
      }

      // Compute chunk window from events
      let chunkStartedAt = new Date();
      let chunkEndedAt = new Date();
      try {
        const firstTs = events?.[0]?.timestamp || Date.now();
        const lastTs = events?.[events.length - 1]?.timestamp || Date.now();
        chunkStartedAt = new Date(firstTs);
        chunkEndedAt = new Date(lastTs);
        // eslint-disable-next-line
      } catch (_) {}

      // Create a chunk record per upload
      const chunk = await prisma.sessionChunk.create({
        data: {
          sessionId: session.id,
          fileId: uploaded.id,
          startedAt: chunkStartedAt,
          endedAt: chunkEndedAt,
        },
      });

      // Update session envelope
      const updateData = {
        path: meta?.path || session.path,
        pageType: meta?.pageType || session.pageType,
        metadata: meta && Object.keys(meta).length ? meta : session.metadata,
        endedAt: chunkEndedAt,
      };
      if (reason === "close") {
        updateData.active = false;
        updateData.terminationReason = "CLOSE";
      } else if (reason === "unload") {
        updateData.active = false;
        updateData.terminationReason = "UNLOAD";
      } else {
        updateData.active = true;
      }
      session = await prisma.session.update({
        where: { id: session.id },
        data: updateData,
      });

      return res.json({ session, file: uploaded, chunk });
    } catch (e) {
      console.error("Session create/finalize failed", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

// PATCH /api/events/:eventId/sessions
// Attach foreign keys to the current session (via cookie) and mark converted=true
export const patch = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const instanceId = req.instanceId;
      const { registrationId, volunteerRegistrationId } = req.body || {};

      if (!eventId) return res.status(400).json({ message: "Missing eventId" });
      if (!instanceId)
        return res.status(400).json({ message: "Missing X-Instance header" });

      const event = await prisma.event.findFirst({
        where: { OR: [{ id: eventId }, { slug: eventId }] },
        select: { id: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const cookies = parseCookies(req.headers.cookie);
      const sid = cookies?.ep_sessionId;
      if (!sid) return res.status(400).json({ message: "No session cookie" });

      const session = await prisma.session.findUnique({ where: { id: sid } });
      if (
        !session ||
        session.eventId !== event.id ||
        session.instanceId !== instanceId
      ) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await prisma.session.update({
        where: { id: sid },
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
