import { prisma } from "#prisma";

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

      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session || session.eventId !== event.id || session.instanceId !== instanceId) {
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
