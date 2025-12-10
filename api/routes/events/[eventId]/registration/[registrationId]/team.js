import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { serializeError } from "#serializeError";
import { reportApiError } from "#util/reportApiError.js";

const bodySchema = z.object({
  teamId: z.string().min(1).optional().nullable(),
  teamCode: z.string().min(1).max(32).optional().nullable(),
});

export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, registrationId } = req.params;
    const parse = bodySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: serializeError(parse) });
    }

    const { teamId: rawTeamId, teamCode: rawTeamCode } = parse.data;
    const teamId = rawTeamId?.trim() || null;
    const teamCode = rawTeamCode?.trim() || null;

    try {
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { team: { select: { id: true } } },
      });
      if (!registration || registration.eventId !== eventId) {
        return res.status(404).json({ message: "Registration not found" });
      }

      let targetTeam = null;
      if (teamId) {
        targetTeam = await prisma.team.findFirst({
          where: {
            id: teamId,
            eventId,
            instanceId: req.instanceId,
            deleted: false,
          },
        });
        if (!targetTeam) {
          return res.status(400).json({ message: "Team not found" });
        }
      } else if (teamCode) {
        targetTeam = await prisma.team.findFirst({
          where: {
            code: teamCode,
            eventId,
            instanceId: req.instanceId,
            deleted: false,
          },
        });
        if (!targetTeam) {
          return res.status(400).json({ message: "Invalid team code" });
        }
      }

      if (targetTeam?.maxSize != null) {
        const memberCount = await prisma.registration.count({
          where: {
            teamId: targetTeam.id,
            instanceId: req.instanceId,
            finalized: true,
            id: { not: registrationId },
          },
        });
        if (memberCount >= targetTeam.maxSize) {
          return res.status(400).json({ message: "Team is full" });
        }
      }

      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          teamId: targetTeam ? targetTeam.id : null,
        },
        include: {
          team: { select: { id: true, name: true } },
        },
      });

      if ((registration.teamId ?? null) !== (targetTeam?.id ?? null)) {
        await prisma.logs.create({
          data: {
            type: LogType.REGISTRATION_UPDATED,
            userId: req.user?.id ?? null,
            ip: req.ip,
            eventId,
            instanceId: req.instanceId,
            registrationId,
            data: {
              previousTeamId: registration.teamId ?? null,
              teamId: targetTeam?.id ?? null,
            },
          },
        });
      }

      return res.json({
        team: updated.team ?? null,
      });
    } catch (error) {
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];
