import { prisma } from "#prisma";

// Public lookup by code to show team name before submit
export const get = [
  async (req, res) => {
    const { eventId } = req.params;
    const { code } = req.query;
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ message: "Missing team code" });
    }
    const team = await prisma.team.findFirst({
      where: {
        code: code.trim(),
        eventId,
        instanceId: req.instanceId,
        deleted: false,
      },
      select: { id: true, name: true, public: true, maxSize: true },
    });
    if (!team) return res.status(404).json({ message: "Team not found" });

    const memberCount = await prisma.registration.count({
      where: { teamId: team.id, instanceId: req.instanceId, finalized: true },
    });
    const available = team.maxSize == null || memberCount < team.maxSize;

    return res.json({ team: { ...team, available } });
  },
];
