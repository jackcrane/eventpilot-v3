import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { sendEmail } from "#postmark";
import { forceTestError } from "#forceError";
import WelcomeEmail from "#emails/welcome.jsx";
import { render } from "@react-email/render";
import { stripe } from "#stripe";

export const post = async (req, res) => {
  try {
    forceTestError(req);
    const { email, password, name } = req.body;

    // validate email and password
    const schema = z.object({
      email: z.string().email(),
      name: z
        .string()
        .min(2, { message: "Name must be at least 2 characters" }),
      password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
    });

    const result = schema.safeParse({ email, password, name });

    if (!result.success) {
      const serializedError = result.error.issues
        .map((issue) => {
          return issue.message;
        })
        .join(", ");

      return res.status(400).json({ message: serializedError });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailPreferences: {
          create: {},
        },
      },
    });

    const customer = await stripe.customers.create({
      email: email,
      name: name,
    });

    await prisma.logs.create({
      data: {
        type: LogType.STRIPE_CUSTOMER_CREATED,
        userId: user.id,
        ip: req.ip,
        data: customer,
      },
    });

    const setup_intent = stripe.setupIntents.create({
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await prisma.logs.create({
      data: {
        type: LogType.STRIPE_SETUP_INTENT_CREATED,
        userId: user.id,
        ip: req.ip,
        data: setup_intent,
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        stripe_customerId: customer.id,
      },
    });

    const emailVerificaton = await prisma.emailVerification.create({
      data: {
        userId: user.id,
      },
    });

    await sendEmail({
      From: "EventPilot Support <EventPilot@geteventpilot.com>",
      To: email,
      Subject: "Welcome to EventPilot",
      HtmlBody: await render(
        WelcomeEmail.WelcomeEmail({
          name: user.name,
          token: emailVerificaton.id,
        })
      ),
      userId: user.id,
    });

    await prisma.logs.create({
      data: {
        type: LogType.USER_CREATED,
        userId: user.id,
        ip: req.ip,
      },
    });

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Resend a verification email
export const put = async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid email" });
  }

  const emailVerificaton = await prisma.emailVerification.create({
    data: {
      userId: user.id,
    },
  });

  await sendEmail({
    From: "EventPilot Support <EventPilot@geteventpilot.com>",
    To: email,
    Subject: "Verify your email address",
    HtmlBody: await render(
      WelcomeEmail.WelcomeEmail({
        name: user.name,
        token: emailVerificaton.id,
      })
    ),
    userId: user.id,
  });

  await prisma.logs.create({
    data: {
      type: LogType.USER_EMAIL_VERIFICATION_RESENT,
      userId: user.id,
      ip: req.ip,
    },
  });

  return res.status(200).json({ message: "Verification email sent" });
};
