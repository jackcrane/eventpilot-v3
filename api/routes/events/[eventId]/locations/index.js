import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(200),
  startTime: z.string(),
  endTime: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
export { schema as locationSchema };

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

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
      orderBy: {
        startTime: "desc",
      },
    });

    const sorted = locations.sort((a, b) => {
      const aDate = new Date(a.startTime);
      const bDate = new Date(b.startTime);
      return aDate - bDate;
    });

    res.json({ locations: sorted });
  },
];
