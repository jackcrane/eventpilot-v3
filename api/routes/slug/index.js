import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  async (req, res) => {
    try {
      const schema = z.object({
        slug: z.string(),
        slugType: z.enum(["event"]),
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

      const entry = await prisma[result.data.slugType]?.findUnique({
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
    } catch (e) {
      console.log(e);
      reportApiError(e, req);
      res.status(500).json({ message: "Error" });
    }
  },
];
