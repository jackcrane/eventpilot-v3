import { verifyAuth } from "#verifyAuth";
import { getEmitter } from "#sse";

// GET /api/events/:eventId/conversations/v2/stream
// Server-Sent Events stream for conversation email events.
// Authentication: Accepts standard Authorization header or `?token=...` query param
export const get = [
  // Adapt Authorization from query token for EventSource compatibility
  (req, _res, next) => {
    try {
      const token = req.query?.token;
      if (token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${token}`;
      }
    } catch (_) {}
    next();
  },
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Allow CORS for dev if needed; relies on same-origin in app otherwise
    if (process.env.NODE_ENV === "development") {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Initial comment to establish the stream
    res.write(": connected\n\n");

    const ee = getEmitter(eventId);

    const onEmail = (payload) => {
      try {
        const data = JSON.stringify(payload || {});
        res.write(`event: email\n`);
        res.write(`data: ${data}\n\n`);
      } catch (e) {
        // best-effort; ignore
      }
    };

    ee.on("email", onEmail);

    // Heartbeat to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch (_) {}
    }, 25000);

    // Cleanup when the client disconnects
    req.on("close", () => {
      try {
        clearInterval(heartbeat);
      } catch (_) {}
      try {
        ee.off("email", onEmail);
      } catch (_) {}
      try {
        res.end();
      } catch (_) {}
    });
  },
];
