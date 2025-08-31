import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";
import { generateTeamCode } from "#util/generateTeamCode";

export const teamSchema = z.object({
  name: z.string().min(2).max(64),
  // Optional; empty string allowed and triggers auto-generation
  code: z.string().min(2).max(32).optional().or(z.literal("")),
  maxSize: z.number().int().min(1).nullable().optional(),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const result = teamSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.format() });
    }

    const { eventId } = req.params;
    const { name, code, maxSize } = result.data;

    // Use provided code or auto-generate an 8-char code from allowed characters
    let codeToUse = (code || "").trim();
    if (!codeToUse) codeToUse = generateTeamCode(8);

    try {
      let team;
      // Retry a few times on unique conflicts with generated codes
      for (let i = 0; i < 5; i++) {
        try {
          team = await prisma.team.create({
            data: {
              name,
              code: codeToUse,
              maxSize: maxSize ?? null,
              event: { connect: { id: eventId } },
              instance: { connect: { id: req.instanceId } },
            },
          });
          break; // success
        } catch (e) {
          if (e?.code === "P2002" && !code) {
            // only retry if we auto-generated or user left blank
            codeToUse = generateTeamCode(8);
            continue;
          }
          throw e;
        }
      }
      if (!team) throw new Error("Failed to create unique team code");

      // Return full list for convenience
      const teams = await prisma.team.findMany({
        where: { eventId, instanceId: req.instanceId, deleted: false },
        include: {
          registrations: {
            where: { finalized: true, instanceId: req.instanceId },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const enriched = teams.map((t) => ({
        ...t,
        memberCount: t.registrations.length,
      }));

      return res.status(201).json({ team, teams: enriched });
    } catch (e) {
      // Handle unique constraint on code
      if (e?.code === "P2002") {
        return res.status(400).json({
          message: { code: { _errors: ["Code must be unique"] } },
        });
      }
      return res.status(500).json({ message: e.message });
    }
  },
];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const teams = await prisma.team.findMany({
      where: { eventId, instanceId: req.instanceId, deleted: false },
      include: {
        registrations: {
          where: { finalized: true, instanceId: req.instanceId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      teams: teams.map((t) => ({ ...t, memberCount: t.registrations.length })),
    });
  },
];

export const query = [(req, res) => res.json(zerialize(teamSchema))];
