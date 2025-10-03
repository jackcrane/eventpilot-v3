import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";

const bodySchema = z.object({
  checkedIn: z.boolean(),
});

export const patch = [
  verifyAuth(["manager", "dod:registration"]),
  async (req, res) => {
    const parseResult = bodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const { checkedIn } = parseResult.data;
    const { registrationId, eventId } = req.params;

    try {
      const existing = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: {
          id: true,
          eventId: true,
          instanceId: true,
          deleted: true,
          checkedInAt: true,
          checkedInById: true,
        },
      });

      if (!existing || existing.eventId !== eventId || existing.deleted) {
        return res.status(404).json({ message: "Registration not found" });
      }

      const alreadyCheckedIn = Boolean(existing.checkedInAt);
      if (alreadyCheckedIn === checkedIn) {
        const unchanged = await prisma.registration.findUnique({
          where: { id: registrationId },
          select: {
            checkedInAt: true,
            checkedInBy: {
              select: { id: true, name: true },
            },
          },
        });
        return res.json({
          updated: false,
          checkedInAt: unchanged?.checkedInAt ?? existing.checkedInAt,
          checkedInBy: unchanged?.checkedInBy ?? null,
        });
      }

      const timestamp = checkedIn ? new Date() : null;
      const actorAccountId = checkedIn
        ? req.dayOfDashboardAccount?.id ?? null
        : null;

      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          checkedInAt: timestamp,
          checkedInById: actorAccountId,
        },
        include: {
          checkedInBy: {
            select: { id: true, name: true },
          },
        },
      });

      try {
        await prisma.logs.create({
          data: {
            type: LogType.REGISTRATION_UPDATED,
            eventId,
            instanceId: updated.instanceId,
            registrationId: updated.id,
            userId: req.user?.id ?? null,
            dayOfDashboardAccountId: req.dayOfDashboardAccount?.id ?? null,
            ip: req.ip,
            data: {
              checkedInAt: updated.checkedInAt
                ? updated.checkedInAt.toISOString()
                : null,
            },
          },
        });
      } catch (logError) {
        console.error("Failed to log registration check-in", logError);
      }

      return res.json({
        updated: true,
        checkedInAt: updated.checkedInAt,
        checkedInBy: updated.checkedInBy,
      });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];
