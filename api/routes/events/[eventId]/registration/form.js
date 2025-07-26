import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { z } from "zod";

import { formSchema } from "../../../../util/formSchema";

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const result = formSchema.safeParse(req.body);
      if (!result.success) {
        console.log(result.error);
        return res.status(400).json({ message: serializeError(result) });
      }

      return res.json(result);

      return res.json({ message: "Form created successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error });
    }
  },
];
