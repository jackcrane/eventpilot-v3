import { getChangedKeys } from "#getChangedKeys";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

export const get = [
  verifyAuth(["manager"]),
  (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        suspended: req.user.suspended,
        accountType: req.user.accountType,
        emailVerified: req.user.emailVerified,
        phoneNumber: req.user.phoneNumber,
      },
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const schema = z
      .object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().min(10).optional().nullable(),
      })
      .strict();

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const user = await prisma.user.update({
      data: {
        name: result.data.name,
        email: result.data.email,
        emailVerified:
          result.data.email === req.user.email ? req.user.emailVerified : false,
        phoneNumber: result.data.phoneNumber,
      },
      where: {
        id: req.user.id,
      },
    });

    const changedKeys = getChangedKeys(req.user, user);

    if (Object.keys(changedKeys).length !== 0) {
      await prisma.logs.create({
        data: {
          type: "USER_ACCOUNT_UPDATED",
          userId: req.user.id,
          ip: req.ip,
          data: changedKeys,
        },
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        suspended: user.suspended,
        accountType: user.accountType,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
      },
    });

    req.user = user;
  },
];
