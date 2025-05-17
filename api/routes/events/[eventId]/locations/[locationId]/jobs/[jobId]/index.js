import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { serializeError } from "#serializeError";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  capacity: z.number().min(0),
  restrictions: z.array(
    z.enum([
      "OVER_18",
      "OVER_21",
      "SPECIAL_CERT_REQUIRED",
      "PHYSICAL_ABILITY",
      "OTHER",
    ])
  ),
  shifts: z.array(
    z.object({
      capacity: z.number().min(0),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
});

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId, locationId, jobId } = req.params;
    try {
      const job = await prisma.job.findUnique({
        where: {
          id: jobId,
        },
        include: {
          shifts: true,
        },
      });

      if (!job || job.locationId !== locationId) {
        return res.status(404).json({ message: "Job not found" });
      }

      return res.json({
        job,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId, jobId } = req.params;
    try {
      await prisma.job.delete({
        where: {
          id: jobId,
        },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId, jobId } = req.params;
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }
    const { name, description, capacity, restrictions, shifts } = result.data;

    try {
      const job = await prisma.job.update({
        where: {
          id: jobId,
        },
        data: {
          name,
          description,
          capacity,
          restrictions,
          eventId,
          locationId,
        },
      });

      return res.json({
        job,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];
