import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";

const savedSegmentUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  favorite: z.boolean().optional(),
  lastUsed: z.string().datetime().optional(),
});

export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, segmentId } = req.params;
    const parsed = savedSegmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }

    try {
      const existing = await prisma.crmSavedSegment.findFirst({
        where: { id: segmentId, eventId, deleted: false },
      });
      if (!existing)
        return res.status(404).json({ message: "Saved segment not found" });

      const data = {};
      if (parsed.data.title != null)
        data.title = parsed.data.title.trim() || null;
      if (parsed.data.favorite != null) data.favorite = parsed.data.favorite;
      if (parsed.data.lastUsed != null)
        data.lastUsed = new Date(parsed.data.lastUsed);

      const updated = await prisma.crmSavedSegment.update({
        where: { id: existing.id },
        data,
      });
      return res.json({ savedSegment: updated });
    } catch (e) {
      console.error("[CRM SAVED SEGMENTS][PATCH] Error:", e);
      reportApiError(e, req);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const query = [
  verifyAuth(["manager"]),
  (_req, res) => res.json(zerialize(savedSegmentUpdateSchema)),
];
