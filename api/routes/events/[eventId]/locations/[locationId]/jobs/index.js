import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

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
  location: z.string().cuid(),
  shifts: z.array(
    z.object({
      capacity: z.number().min(0),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId } = req.params;
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log(result.error.issues);
      return res.status(400).json({ message: result.error.issues });
    }

    const { name, description, capacity, restrictions, location, shifts } =
      result.data;

    try {
      const job = await prisma.job.create({
        data: {
          name,
          description,
          capacity,
          restrictions,
          event: { connect: { id: eventId } },
          location: { connect: { id: locationId } },
          shifts: {
            create: shifts.map(({ capacity, startTime, endTime }) => ({
              capacity,
              startTime: startTime,
              endTime: endTime,
              event: { connect: { id: eventId } },
              location: { connect: { id: locationId } },
            })),
          },
        },
        include: { shifts: true },
      });

      return res.status(201).json({ message: "Job created", job });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId, locationId } = req.params;
    try {
      const jobs = await prisma.job.findMany({
        where: {
          locationId,
        },
        include: {
          shifts: true,
        },
      });

      return res.json({
        jobs,
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
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },
];
