import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { sendEmail } from "#postmark";
import { getGeolocation } from "#geolocation";
import { forceTestError } from "#forceError";
import LoginEmail from "#emails/login.jsx";
import { render } from "@react-email/render";
import { reportApiError } from "#util/reportApiError.js";
import { captureApiEvent, identifyApiUser } from "#util/posthog.js";

dotenv.config();

const getEmailDomain = (email) =>
  typeof email === "string" && email.includes("@") ? email.split("@").pop() : null;

export const post = async (req, res) => {
  try {
    forceTestError(req);
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
      include: {
        emailPreferences: true,
      },
    });

    if (!user) {
      await captureApiEvent(req, "api_auth_login_failed", {
        email_domain: getEmailDomain(email),
        failure_reason: "user_not_found",
      });
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await captureApiEvent(req, "api_auth_login_failed", {
        email_domain: getEmailDomain(email),
        user_id: user.id,
        failure_reason: "invalid_password",
      });
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("User: ", user);
    if (!user.emailVerified) {
      console.log("Email not verified");
      await captureApiEvent(req, "api_auth_login_failed", {
        email_domain: getEmailDomain(email),
        user_id: user.id,
        failure_reason: "email_not_verified",
      });
      return res.status(400).json({
        message:
          "Your email is not verified. Please check your email for a verification link.",
      });
    }

    await prisma.logs.create({
      data: {
        type: LogType.USER_LOGIN,
        userId: user.id,
        ip: req.ip,
      },
    });

    if (user.emailPreferences?.login) {
      const { city, regionName } = await getGeolocation(req.ip);
      const ip = req.ip;

      await sendEmail({
        From: "EventPilot Support <EventPilot@geteventpilot.com>",
        To: email,
        Subject: "New login to EventPilot",
        HtmlBody: await render(
          LoginEmail.LoginEmail({ name: user.name, city, regionName, ip })
        ),
        userId: user.id,
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    const posthogReq = { ...req, user };
    await identifyApiUser(posthogReq, {
      last_login_at: new Date().toISOString(),
    });
    await captureApiEvent(
      posthogReq,
      "api_auth_login_succeeded",
      {
        email_domain: getEmailDomain(email),
        login_notification_enabled: Boolean(user.emailPreferences?.login),
      },
      { distinctId: user.id }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    reportApiError(error, req);
    return res.status(500).json({ message: "Internal server error" });
  }
};
