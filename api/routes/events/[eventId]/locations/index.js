import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  startTime: z.date(),
  endTime: z.date(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    try {
      req.body.startTime = new Date(req.body.startTime);
      req.body.endTime = new Date(req.body.endTime);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "Invalid date" });
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log(result.error.issues);
      return res.status(400).json({ message: result.error.issues });
    }
    const { name, description } = result.data;

    try {
      const location = await prisma.location.create({
        data: {
          name,
          description,
          eventId,
          ...result.data,
        },
      });

      return res.status(201).json({ message: "Location created", location });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const locations = await prisma.location.findMany({
      where: {
        eventId,
      },
      include: {
        jobs: true,
        shifts: true,
      },
    });
    res.json({ locations });
  },
];
