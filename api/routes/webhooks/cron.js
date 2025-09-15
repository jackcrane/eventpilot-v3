import { prisma } from "#prisma";
import { sendEmail } from "#postmark";
import { render } from "@react-email/render";
import DailyDigestEmail from "#emails/daily-digest.jsx";
// Gmail ingestion logic factored into reusable helper
import { ingestGmailWindowForEvent } from "./fragments/ingestGmailWindow.js";

export const post = async (req, res) => {
  try {
    const { frequency } = req.body;

    // Campaign queue processing moved to an explicit endpoint; no longer run in cron

    // 1) Minutely Gmail ingestion (idempotent via messageId)
    // Runs regardless of frequency, but you can scope it if desired
    const gmailConns = await prisma.gmailConnection.findMany({
      select: { eventId: true, email: true },
    });
    for (const conn of gmailConns) {
      try {
        await ingestGmailWindowForEvent({
          eventId: conn.eventId,
          q: "newer_than:1d -in:chats",
          reqId: req.id,
        });
      } catch (err) {
        // If no gmail connection or invalid creds, skip
        const msg = String(err?.message || "");
        if (
          err?.code === "NO_GMAIL_CONNECTION" ||
          msg.includes("invalid_grant") ||
          msg.includes("invalid_credentials")
        ) {
          continue;
        }
        console.error(`[${req.id}] [CRON][GMAIL] error`, err);
      }
    }

    if (frequency === "DAILY") {
      const events = await prisma.event.findMany({
        include: {
          user: true,
        },
      });

      for (const event of events) {
        const newFormResponses = await prisma.volunteerRegistration.count({
          where: {
            createdAt: { gt: new Date(Date.now() - 3600000) },
            eventId: event.id,
            deleted: false,
          },
        });
        const newCrmPersons = await prisma.crmPerson.count({
          where: {
            createdAt: { gt: new Date(Date.now() - 3600000) },
            eventId: event.id,
            deleted: false,
          },
        });
        const newEmails = await prisma.inboundEmail.count({
          where: {
            createdAt: { gt: new Date(Date.now() - 3600000) },
            // read: false,
            eventId: event.id,
            conversation: {
              deleted: false,
            },
          },
        });

        // console.log(
        //   `[HOURLY] EventPilot daily digest for ${event.name}: ${newFormResponses} new form responses, ${newCrmPersons} new CRM persons, and ${newEmails} new emails`
        // );
        await sendEmail({
          From: "EventPilot Daily Digests <daily-digests@geteventpilot.com>",
          To: event.contactEmail || event.user.email,
          Subject: `Your EventPilot ${event.name} Daily Digest for ${new Date().toLocaleDateString()}`,
          HtmlBody: await render(
            DailyDigestEmail.DailyDigestEmail({
              name: event.user.name,
              event,
              newFormResponses,
              newCrmPersons,
              newEmails,
            })
          ),
          userId: event.user.id,
        });
      }
    }

    return res.status(200).json({ message: "Webhook received" });
  } catch (e) {
    console.error("Error in POST /webhooks/cron:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};
