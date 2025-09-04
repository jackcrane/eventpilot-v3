import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    return res
      .status(400)
      .json({ message: "User-level payment setup disabled" });
  },
];
