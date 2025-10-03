import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { reportApiError } from "#util/reportApiError.js";

// GET /api/events/:eventId/crm/person/:personId/involvement
// Returns a simple summary of the person's involvement grouped by instance
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, personId } = req.params;

    try {
      // Ensure person exists and belongs to this event
      const person = await prisma.crmPerson.findUnique({
        where: { id: personId },
        select: { id: true, eventId: true, deleted: true },
      });
      if (!person || person.deleted || person.eventId !== eventId) {
        return res.status(404).json({ message: "Person not found" });
      }

      // Volunteer registrations linked to this person
      const volunteerRegs = await prisma.volunteerRegistration.findMany({
        where: {
          deleted: false,
          crmPersonLink: { crmPersonId: personId },
        },
        include: {
          instance: { select: { id: true, name: true } },
          shifts: {
            include: {
              shift: {
                select: {
                  id: true,
                  instanceId: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Participant registrations linked to this person
      const participantRegs = await prisma.registration.findMany({
        where: {
          deleted: false,
          crmPersonId: personId,
        },
        include: {
          instance: { select: { id: true, name: true } },
          registrationTier: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Collect unique instance ids from both sides
      const map = new Map();

      for (const vr of volunteerRegs) {
        const key = vr.instance.id;
        if (!map.has(key)) {
          map.set(key, {
            instance: { id: vr.instance.id, name: vr.instance.name },
            volunteer: { registrations: [], shiftCount: 0 },
            participant: { registrations: [] },
          });
        }
        const entry = map.get(key);
        const shiftCount = (vr.shifts || []).length;
        entry.volunteer.registrations.push({
          id: vr.id,
          shiftCount,
        });
        entry.volunteer.shiftCount += shiftCount;
      }

      for (const pr of participantRegs) {
        const key = pr.instance.id;
        if (!map.has(key)) {
          map.set(key, {
            instance: { id: pr.instance.id, name: pr.instance.name },
            volunteer: { registrations: [], shiftCount: 0 },
            participant: { registrations: [] },
          });
        }
        const entry = map.get(key);
        entry.participant.registrations.push({
          id: pr.id,
          tierName: pr.registrationTier?.name || null,
          teamName: pr.team?.name || null,
          finalized: pr.finalized,
        });
      }

      const involvement = Array.from(map.values()).sort((a, b) =>
        a.instance.name.localeCompare(b.instance.name)
      );

      return res.json({ involvement });
    } catch (e) {
      console.error("[INVOLVEMENT][GET] Error:", e);
      reportApiError(e, req);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

