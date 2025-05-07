import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    console.log(req.params.eventId);
    const event = await prisma.event.findFirst({
      where: {
        userId: req.user.id,
        OR: [{ slug: req.params.eventId }, { id: req.params.eventId }],
      },
      include: {
        logo: {
          select: {
            location: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!req.user.id) {
      delete event.userId;
    }

    res.json({
      event,
    });
  },
];
