import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { teamSchema } from "./index";
import { zerialize } from "zodex";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, teamId } = req.params;
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        eventId,
        instanceId: req.instanceId,
        deleted: false,
      },
      include: {
        registrations: {
          where: { finalized: true, instanceId: req.instanceId },
          select: { id: true },
        },
      },
    });
    if (!team) return res.status(404).json({ message: "Team not found" });
    return res.json({
      team: { ...team, memberCount: team.registrations.length },
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, teamId } = req.params;

    const parse = teamSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: parse.error.format() });
    }
    const { name, code, maxSize } = parse.data;

    const before = await prisma.team.findFirst({
      where: {
        id: teamId,
        eventId,
        instanceId: req.instanceId,
        deleted: false,
      },
    });
    if (!before) return res.status(404).json({ message: "Team not found" });

    try {
      // If code is provided and non-empty, update it; if blank/undefined, preserve existing code
      let codeToUse = (code ?? "").trim();
      if (!codeToUse) codeToUse = before.code; // keep existing

      const team = await prisma.team.update({
        where: { id: teamId },
        data: {
          name,
          code: codeToUse,
          maxSize: maxSize ?? null,
        },
      });
      return res.json({ team });
    } catch (e) {
      if (e?.code === "P2002") {
        return res.status(400).json({
          message: { code: { _errors: ["Code must be unique"] } },
        });
      }
      return res.status(500).json({ message: e.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, teamId } = req.params;
    const before = await prisma.team.findFirst({
      where: {
        id: teamId,
        eventId,
        instanceId: req.instanceId,
        deleted: false,
      },
    });
    if (!before) return res.status(404).json({ message: "Team not found" });

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { deleted: true },
    });
    return res.json({ team });
  },
];

export const query = [(req, res) => res.json(zerialize(teamSchema))];
