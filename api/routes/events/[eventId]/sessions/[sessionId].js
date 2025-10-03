import { prisma } from "#prisma";
import { uploadFile } from "#file";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";

/**
 * POST /api/events/:eventId/sessions/:sessionId
 * Body: {
 *   chunk: {
 *     fileB64: string,            // base64 of JSON {events...}
 *     filename: string,           // e.g. rrweb-<sessionId>-<ts>.json
 *     contentType: "application/json",
 *     startedAt: number,          // ms epoch
 *     endedAt: number             // ms epoch
 *   },
 *   finalize?: boolean,
 *   terminationReason?: "UNLOAD" | "CLOSE",
 *   pageType?, path?
 * }
 */

export const post = [
  async (req, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const {
        chunk,
        finalize = false,
        terminationReason = null,
        pageType,
        path,
      } = req.body ?? {};

      if (!chunk?.fileB64 || !chunk?.filename || !chunk?.contentType) {
        return res.status(400).json({ message: "Missing chunk payload" });
      }

      // Ensure the session exists & belongs to the event
      const session = await prisma.session.findFirst({
        where: { id: sessionId, eventId },
        select: { id: true, startedAt: true },
      });
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Store the JSON chunk in S3 via your uploadFile helper
      const uploaded = await uploadFile({
        file: chunk.fileB64,
        name: chunk.filename,
        contentType: chunk.contentType || "application/json",
      });

      // Create SessionChunk row
      const startedAt =
        typeof chunk.startedAt === "number"
          ? new Date(chunk.startedAt)
          : new Date();
      const endedAt =
        typeof chunk.endedAt === "number"
          ? new Date(chunk.endedAt)
          : new Date();

      await prisma.sessionChunk.create({
        data: {
          sessionId: sessionId,
          fileId: uploaded.id,
          startedAt,
          endedAt,
        },
      });

      // Optional: update some rolling metadata for convenience (page/path drifting)
      if (pageType || path) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            pageType: pageType ?? undefined,
            path: path ?? undefined,
          },
        });
      }

      // Finalize if requested
      if (finalize) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            active: false,
            endedAt,
            terminationReason: terminationReason || null,
          },
        });
      }

      res.json({ ok: true, fileId: uploaded.id });
    } catch (err) {
      console.error("Upload/Finalize session error:", err);
      reportApiError(err, req);
      res.status(500).json({ message: "Failed to persist session chunk" });
    }
  },
];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId, sessionId } = req.params;

      const session = await prisma.session.findUnique({
        where: { id: sessionId, eventId },
        include: {
          SessionChunk: {
            include: {
              file: true,
            },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Load session chunk data and merge to one array of events
      const events = [];
      const files = session.SessionChunk.map((chunk) => chunk.file.location);
      for (const file of files) {
        const data = await fetch(file);
        const json = await data.json();
        events.push(...json.events);
      }

      session.events = events;
      delete session.SessionChunk;

      res.json(session);
    } catch (err) {
      console.error("Get session error:", err);
      reportApiError(err, req);
      res.status(500).json({ message: "Failed to get session" });
    }
  },
];
