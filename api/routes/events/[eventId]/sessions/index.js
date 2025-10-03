import { prisma } from "#prisma";

/**
 * POST /api/events/:eventId/sessions
 * Body: {
 *   instanceId?,
 *   pageType?,
 *   path?,
 *   metadata?: { startedAt?: number, userAgent?: string, ... }
 * }
 * Returns: { id }
 */
export const post = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { instanceId, pageType, path, metadata } = req.body ?? {};

      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.connection?.remoteAddress ||
        null;

      const session = await prisma.session.create({
        data: {
          eventId,
          instanceId: instanceId || null,
          pageType: pageType || null,
          path: path || req.path || null,
          metadata: metadata || {},
          startedAt:
            metadata?.startedAt != null
              ? new Date(Number(metadata.startedAt))
              : new Date(),
          ip,
          active: true,
        },
        select: { id: true },
      });

      res.json(session);
    } catch (err) {
      console.error("Create session error:", err);
      reportApiError(err, req);
      res.status(500).json({ message: "Failed to create session" });
    }
  },
];
