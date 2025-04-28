import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { getChangedKeys } from "#getChangedKeys";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
      include: {
        emailPreferences: true,
      },
    });

    delete user.emailPreferences.id;
    delete user.emailPreferences.userId;
    delete user.emailPreferences.createdAt;
    delete user.emailPreferences.updatedAt;

    res.json({
      emailPreferences: user.emailPreferences,
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    // Validate email preferences
    const schema = z.strictObject({
      login: z.boolean().optional(),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
      include: {
        emailPreferences: true,
      },
    });

    const updatedPreferences = await prisma.emailPreferences.update({
      where: {
        userId: user.id,
      },
      data: {
        login: result.data.login,
      },
    });

    const changedKeys = getChangedKeys(
      user.emailPreferences,
      updatedPreferences
    );

    if (Object.keys(changedKeys).length !== 0) {
      await prisma.logs.create({
        data: {
          type: "USER_EMAIL_PREFERENCES_UPDATED",
          userId: req.user.id,
          ip: req.ip,
          data: changedKeys,
        },
      });
    }

    res.json({
      emailPreferences: user.emailPreferences,
    });
  },
];
