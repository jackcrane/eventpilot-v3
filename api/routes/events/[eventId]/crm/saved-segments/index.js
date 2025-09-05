import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";

// Schema for creating a saved segment
export const savedSegmentCreateSchema = z.object({
  title: z.string().min(1).optional(),
  prompt: z.string().min(1),
  ast: z.any(), // validated on write client-side; server stores JSON as-is
  favorite: z.boolean().optional().default(false),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    try {
      const rows = await prisma.crmSavedSegment.findMany({
        where: { eventId, deleted: false },
        orderBy: [{ favorite: "desc" }, { lastUsed: "desc" }, { updatedAt: "desc" }],
      });
      return res.json({ savedSegments: rows });
    } catch (e) {
      console.error("[CRM SAVED SEGMENTS][GET] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const parsed = savedSegmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }
    const { title, prompt, ast, favorite = false } = parsed.data;
    try {
      const saved = await prisma.crmSavedSegment.create({
        data: {
          eventId,
          title: title?.trim() || null,
          prompt,
          ast,
          favorite,
          lastUsed: new Date(),
        },
      });
      return res.status(201).json({ savedSegment: saved });
    } catch (e) {
      console.error("[CRM SAVED SEGMENTS][POST] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const query = [
  verifyAuth(["manager"]),
  (_req, res) => res.json(zerialize(savedSegmentCreateSchema)),
];

