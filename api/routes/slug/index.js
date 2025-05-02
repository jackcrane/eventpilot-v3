import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  async (req, res) => {
    const schema = z.object({
      slug: z.string(),
      slugType: z.enum(["event", "campaign"]),
    });

    const [type, slug] = req.query.s?.split(":") || [];
    console.log(req.query.s);

    const result = schema.safeParse({
      slug: slug,
      slugType: type,
    });

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const entry = await prisma[result.data.slugType].findUnique({
      where: {
        slug: result.data.slug,
      },
    });

    if (entry) {
      res.json({
        present: true,
      });
    } else {
      res.json({
        present: false,
      });
    }
  },
];
