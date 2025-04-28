import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { getGeolocation } from "#geolocation";

export const get = [
  verifyAuth(["instructor", "dispatcher", "manager"]),
  async (req, res) => {
    const logTypes = req.query.logTypes.split(",");

    z.enum(["USER_CREATED", "USER_LOGIN", "USER_PASSWORD_RESET_REQUEST"]);

    const schema = z.array(
      z.enum([
        "USER_CREATED",
        "USER_LOGIN",
        "USER_PASSWORD_RESET_REQUEST",
        "USER_PASSWORD_RESET",
        "USER_EMAIL_VERIFICATION_RESENT",
        "USER_ACCOUNT_UPDATED",
        "USER_EMAIL_PREFERENCES_UPDATED",
        "EMAIL_SENT",
        "EMAIL_VERIFIED",
      ])
    );

    const result = schema.safeParse(logTypes);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const take = parseInt(req.query.take) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const logs = await prisma.logs.findMany({
      where: {
        userId: req.user.id,
        type: {
          in: logTypes,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: take,
      skip: skip,
    });

    if (!logs) {
      return res.status(400).json({ message: "No logs found" });
    }

    const totalCount = await prisma.logs.count({
      where: {
        userId: req.user.id,
        type: {
          in: logTypes,
        },
      },
    });

    const logsWithLocation = await Promise.all(
      logs.map(async (log) => {
        const location = await getGeolocation(log.ip); // Assuming logs have an `ip` field
        return {
          ...log,
          location,
        };
      })
    );

    res.json({
      logs: logsWithLocation,
      meta: {
        totalCount,
        take,
        skip,
      },
    });
  },
];
