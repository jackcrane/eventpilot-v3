import { prisma } from "#prisma";
import { getGmailClientForEvent, getHeader, extractBodiesAndAttachments } from "#util/google";
import { getOrCreateConversation } from "./getOrCreateConversation.js";
import {
  createInboundEmailFromGmail,
  buildCrmBodyFromGmailMessage,
  parseAddressList,
} from "./createInboundEmailFromGmail.js";
import { createOutboundEmailFromGmail } from "./createOutboundEmailFromGmail.js";
import { sendEmailEvent } from "#sse";
import { processCrmPersonRelationships } from "./processCrmPersonRelationships.js";

const normalizeMailbox = (addr) => {
  if (!addr) return "";
  const [local, domain] = String(addr).toLowerCase().split("@");
  if (!domain) return String(addr).toLowerCase();
  const localNorm = local.includes("+") ? local.split("+")[0] : local;
  return `${localNorm}@${domain}`;
};

// Ingest Gmail messages for a single event constrained by a Gmail search query (q)
// Uses the same logic as the cron endpoint to dedupe and persist inbound/outbound messages.
export const ingestGmailWindowForEvent = async ({ eventId, q, reqId }) => {
  const { gmail, connection } = await getGmailClientForEvent(eventId);
  let pageToken = undefined;
  let processed = 0;
  do {
    const list = await gmail.users.messages.list({
      userId: "me",
      q: q || "-in:chats",
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
        const bodiesAndAtts = extractBodiesAndAttachments(part);
        const bodies = {
          text: bodiesAndAtts.text,
          html: bodiesAndAtts.html,
        };
        const attachments = bodiesAndAtts.attachments || [];
        const headers = (part?.headers || []).reduce(
          (acc, h) => ({
            ...acc,
            [String(h.name).toLowerCase()]: h.value,
          }),
          {}
        );
        const msgId = headers["message-id"] || payload.id;
        const from = headers["from"] || "";
        const to = headers["to"] || "";
        const cc = headers["cc"] || "";

        const selfNorm = normalizeMailbox(connection?.email || "");
        const fromList = parseAddressList(from).map((e) => e.Email);
        const toList = parseAddressList(to).map((e) => e.Email);
        const ccList = parseAddressList(cc).map((e) => e.Email);
        const isFromSelf = fromList.some((a) => normalizeMailbox(a) === selfNorm);
        const isToSelf = [...toList, ...ccList].some(
          (a) => normalizeMailbox(a) === selfNorm
        );

        // Inbound: external -> our connected address
        if (!isFromSelf && isToSelf) {
          const exists = await prisma.inboundEmail.findFirst({
            where: { messageId: msgId, eventId },
            select: { id: true },
          });
          if (exists) {
            processed++;
            continue;
          }

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
            eventId,
            message.threadId
          );
          const created = await createInboundEmailFromGmail(
            {
              gmail,
              eventId,
              conversationId: conversation.id,
              message,
              connectionEmail: connection?.email,
            },
            reqId
          );

          const crmBody = buildCrmBodyFromGmailMessage(message, connection?.email);
          await processCrmPersonRelationships(
            crmBody,
            eventId,
            created.id,
            conversation.id
          );

          try {
            sendEmailEvent(eventId, created);
          } catch (_) {}
          processed++;
          continue;
        }

        // Outbound: our connected address -> external
        if (isFromSelf) {
          const existsOut = await prisma.email.findFirst({
            where: {
              messageId: msgId,
              conversation: { eventId },
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
              eventId,
              message.threadId
            );
            const createdOut = await createOutboundEmailFromGmail(
              {
                eventId,
                conversationId: conversation.id,
                message,
                connectionEmail: connection?.email,
                userId: null,
              },
              reqId
            );
            try {
              sendEmailEvent(eventId, createdOut);
            } catch (_) {}
            processed++;
          } else {
            try {
              await prisma.logs.create({
                data: {
                  type: "EMAIL_VERIFIED",
                  eventId,
                  email: { connect: { id: existsOut.id } },
                  data: { source: "gmail_ingest_window" },
                },
              });
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error(`[${reqId}] [INGEST][GMAIL] per-message error`, err);
      }
    }
  } while (pageToken);
  return { processed };
};
