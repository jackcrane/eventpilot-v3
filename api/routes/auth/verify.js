import { forceTestError } from "#forceError";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

export const get = async (req, res) => {
  try {
    forceTestError(req);
    const { token } = req.query;

    const emailVerification = await prisma.emailVerification.findFirst({
      where: {
        id: token,
        active: true,
      },
      include: {
        user: true,
      },
    });

    if (!emailVerification) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Make sure the token is less than 15 minutes old
    if (Date.now() - emailVerification.createdAt.getTime() > 15 * 60 * 1000) {
      return res
        .status(400)
        .json({
          message: "Token expired",
          email: emailVerification.user.email,
        });
    }

    await prisma.emailVerification.update({
      where: {
        id: token,
      },
      data: {
        active: false,
      },
    });

    console.log(emailVerification.userId);
    const user = await prisma.user.findFirst({
      where: {
        id: emailVerification.userId,
      },
    });

    await prisma.logs.createMany({
      data: [
        {
          type: LogType.EMAIL_VERIFIED,
          userId: user.id,
          ip: req.ip,
        },
        {
          type: LogType.USER_LOGIN,
          userId: user.id,
          ip: req.ip,
        },
      ],
    });

    await prisma.user.update({
      where: {
        id: emailVerification.userId,
      },
      data: {
        emailVerified: true,
      },
    });

    const authtoken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    return res.status(200).json({ token: authtoken, name: user.name });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
