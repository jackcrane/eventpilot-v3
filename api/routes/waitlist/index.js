import { z } from "zod";
import { zerialize } from "zodex";
import { sendEmail } from "#postmark";
import { prisma } from "#prisma";
import { render } from "@react-email/render";
import WaitlistNotification from "#emails/waitlist-notification.jsx";
import WaitlistConfirmation from "#emails/waitlist-confirmation.jsx";

// Public endpoint: allow unauthenticated waitlist submissions

export const waitlistSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email"),
  organization: z.string().optional(),
  website: z.string().url().optional().or(z.literal("").optional()),
  message: z.string().max(2000).optional(),
  eventSize: z.preprocess(
    (v) => (typeof v === "string" ? parseInt(v, 10) : v),
    z
      .number({ required_error: "Estimated participant count is required" })
      .int()
      .positive()
      .max(10000000, "Please provide a reasonable estimate")
  ),
});

// POST /api/waitlist — store via email + existing Email table (no schema changes)
export const post = [
  async (req, res) => {
    try {
      const result = waitlistSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }

      const { name, email, organization, website, message, eventSize } =
        result.data;

      // Persist to DB
      await prisma.waitlist.create({
        data: {
          name,
          email,
          organization,
          website,
          message,
          eventSize,
        },
      });

      // Internal notification (uses React email template)
      await sendEmail({
        From: "EventPilot <support@geteventpilot.com>",
        To: process.env.SUPPORT_EMAIL || "support@geteventpilot.com",
        Subject: `New waitlist signup: ${name}`,
        HtmlBody: await render(
          WaitlistNotification.WaitlistNotificationEmail({
            name,
            email,
            organization,
            website,
            message,
            eventSize,
          })
        ),
        TextBody: `New waitlist signup: ${name} (${email})`,
      });

      // User confirmation email
      await sendEmail({
        From: "EventPilot <support@geteventpilot.com>",
        To: email,
        Subject: "You're on the EventPilot waitlist!",
        HtmlBody: await render(
          WaitlistConfirmation.WaitlistConfirmationEmail({ name })
        ),
      });

      // Minimal acknowledgement to client; include id
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// QUERY /api/waitlist — expose schema for clients
export const query = [(req, res) => res.json(zerialize(waitlistSchema))];
