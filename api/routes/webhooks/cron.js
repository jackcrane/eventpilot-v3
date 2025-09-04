import { prisma } from "#prisma";
import { sendEmail } from "#postmark";
import { render } from "@react-email/render";
import DailyDigestEmail from "#emails/daily-digest.jsx";
import { getGmailClientForEvent, getHeader, extractBodiesAndAttachments } from "#util/google";
import { getOrCreateConversation } from "./fragments/getOrCreateConversation.js";
import {
  createInboundEmailFromGmail,
  buildCrmBodyFromGmailMessage,
} from "./fragments/createInboundEmailFromGmail.js";
import { createOutboundEmailFromGmail } from "./fragments/createOutboundEmailFromGmail.js";
import { processCrmPersonRelationships } from "./fragments/processCrmPersonRelationships.js";
import { sendEmailEvent } from "#sse";

export const post = async (req, res) => {
  try {
    const { frequency } = req.body;

    // 1) Minutely Gmail ingestion (idempotent via messageId)
    // Runs regardless of frequency, but you can scope it if desired
    const gmailConns = await prisma.gmailConnection.findMany({
      select: { eventId: true, email: true },
    });
    for (const conn of gmailConns) {
      try {
        const { gmail } = await getGmailClientForEvent(conn.eventId);
        // Fetch recent messages; dedupe via InboundEmail.messageId
        let pageToken = undefined;
        do {
          const list = await gmail.users.messages.list({
            userId: "me",
            q: "newer_than:2d -in:chats",
            pageToken: pageToken || undefined,
          });
          pageToken = list.data.nextPageToken || null;
          const msgs = list.data.messages || [];
          if (!msgs.length) continue;
          for (const m of msgs) {
            try {
              const full = await gmail.users.messages.get({
                userId: "me",
                id: m.id,
                format: "full",
              });
              const payload = full?.data || {};
              const part = payload?.payload;
              const headers = (part?.headers || []).reduce(
                (acc, h) => ({
                  ...acc,
                  [String(h.name).toLowerCase()]: h.value,
                }),
                {}
              );
              const bodiesAndAtts = extractBodiesAndAttachments(part);
              const bodies = { text: bodiesAndAtts.text, html: bodiesAndAtts.html };
              const attachments = bodiesAndAtts.attachments || [];
              const msgId = headers["message-id"] || payload.id;
              const from = headers["from"] || "";
              const to = headers["to"] || "";
              const cc = headers["cc"] || "";
              const isFromSelf = String(from)
                .toLowerCase()
                .includes(String(conn.email).toLowerCase());
              const isToSelf =
                String(to)
                  .toLowerCase()
                  .includes(String(conn.email).toLowerCase()) ||
                String(cc)
                  .toLowerCase()
                  .includes(String(conn.email).toLowerCase());

              // Inbound: external -> our connected address
              if (!isFromSelf && isToSelf) {
                const exists = await prisma.inboundEmail.findFirst({
                  where: { messageId: msgId, eventId: conn.eventId },
                  select: { id: true },
                });
                if (exists) continue;

                const message = {
                  id: payload.id,
                  threadId: payload.threadId,
                  internalDate: payload.internalDate
                    ? new Date(Number(payload.internalDate))
                    : new Date(),
                  headers: {
                    subject: getHeader(part, "Subject") || "",
                    from: getHeader(part, "From") || "",
                    to: getHeader(part, "To") || "",
                    cc: getHeader(part, "Cc") || "",
                    bcc: getHeader(part, "Bcc") || "",
                    date: getHeader(part, "Date") || null,
                    messageId: getHeader(part, "Message-ID") || payload.id,
                  },
                  textBody: bodies.text,
                  htmlBody: bodies.html,
                  attachments,
                };
                const { conversation } = await getOrCreateConversation(
                  conn.eventId,
                  message.threadId
                );
                const created = await createInboundEmailFromGmail(
                  {
                    gmail,
                    eventId: conn.eventId,
                    conversationId: conversation.id,
                    message,
                    connectionEmail: conn.email,
                  },
                  req.id
                );

                const crmBody = buildCrmBodyFromGmailMessage(
                  message,
                  conn.email
                );
                await processCrmPersonRelationships(
                  crmBody,
                  conn.eventId,
                  created.id,
                  conversation.id
                );

                try {
                  sendEmailEvent(conn.eventId, created);
                } catch (_) {}
                continue;
              }

              // Outbound: our connected address -> external
              if (isFromSelf) {
                const existsOut = await prisma.email.findFirst({
                  where: {
                    messageId: msgId,
                    conversation: { eventId: conn.eventId },
                  },
                  select: { id: true },
                });
                if (!existsOut) {
              const message = {
                id: payload.id,
                threadId: payload.threadId,
                internalDate: payload.internalDate
                  ? new Date(Number(payload.internalDate))
                  : new Date(),
                headers: {
                  subject: getHeader(part, "Subject") || "",
                  from: getHeader(part, "From") || "",
                  to: getHeader(part, "To") || "",
                  cc: getHeader(part, "Cc") || "",
                  bcc: getHeader(part, "Bcc") || "",
                  date: getHeader(part, "Date") || null,
                  messageId: getHeader(part, "Message-ID") || payload.id,
                },
                textBody: bodies.text,
                htmlBody: bodies.html,
              };
                  const { conversation } = await getOrCreateConversation(
                    conn.eventId,
                    message.threadId
                  );
                  const createdOut = await createOutboundEmailFromGmail(
                    {
                      eventId: conn.eventId,
                      conversationId: conversation.id,
                      message,
                      connectionEmail: conn.email,
                      userId: null,
                    },
                    req.id
                  );
                  try {
                    sendEmailEvent(conn.eventId, createdOut);
                  } catch (_) {}
                }
              }
            } catch (err) {
              console.error(`[${req.id}] [CRON][GMAIL] per-message error`, err);
            }
          }
        } while (pageToken);
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
