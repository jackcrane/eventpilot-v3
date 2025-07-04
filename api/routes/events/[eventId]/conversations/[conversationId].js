import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { sendEmail } from "#postmark";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, conversationId } = req.params;
    const includeDeleted = req.query.includeDeleted === "true";

    try {
      const convo = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          eventId,
          deleted: includeDeleted,
        },
        include: {
          inboundEmails: {
            include: {
              from: true,
              to: true,
              cc: true,
              bcc: true,
              attachments: {
                include: {
                  file: true,
                },
              },
            },
          },
          outboundEmails: true,
        },
      });

      if (!convo) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Dedupe participants by email address
      const participantsMap = new Map();
      convo.inboundEmails.forEach((email) => {
        if (email.from?.email) {
          participantsMap.set(email.from.email, email.from);
        }
        email.to.forEach((p) => participantsMap.set(p.email, p));
        email.cc.forEach((p) => participantsMap.set(p.email, p));
        email.bcc.forEach((p) => participantsMap.set(p.email, p));
      });
      let participants = Array.from(participantsMap.values());
      participants = participants.filter(
        (p) => !p.email.includes(".geteventpilot.com")
      );

      // Aggregate and sort all emails by createdAt descending
      const inbound = convo.inboundEmails.map((email) => ({
        ...email,
        type: "INBOUND",
      }));
      const outbound = convo.outboundEmails.map((email) => ({
        ...email,
        type: "OUTBOUND",
      }));
      const emails = [...inbound, ...outbound].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      const emailCount = emails.length;
      const mostRecent = emails[0] || null;
      const subject = mostRecent?.subject ?? null;
      const hasUnread = convo.inboundEmails.some((email) => !email.read);
      const hasAttachments = convo.inboundEmails.some(
        (email) => email.attachments?.length > 0
      );
      const lastActivityAt = mostRecent?.createdAt ?? null;

      if (hasUnread) {
        await prisma.inboundEmail.updateMany({
          where: {
            conversationId: convo.id,
          },
          data: {
            read: true,
          },
        });
      }

      // eslint-disable-next-line
      const { inboundEmails, outboundEmails, ...rest } = convo;
      res.json({
        conversation: {
          ...rest,
          participants,
          emailCount,
          subject,
          hasUnread,
          hasAttachments,
          lastActivityAt,
          emails,
        },
      });
    } catch (error) {
      console.error(
        "Error in GET /event/:eventId/conversations/:conversationId:",
        error
      );
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

const messageSchema = z.object({
  message: z.string().min(2),
  to: z.string().email(),
});

// Send a message to the conversation
export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId, conversationId } = req.params;
      const parseResult = messageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: serializeError(parseResult) });
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, eventId },
        include: {
          inboundEmails: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              headers: true,
            },
          },
        },
      });

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          slug: true,
          name: true,
        },
      });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const messageId = conversation.inboundEmails[0].headers.find(
        (h) => h.key.toLowerCase() === "message-id"
      )?.value;

      let split = conversation.inboundEmails[0].originalRecipient.split("@");
      let newRecipient;
      if (split[0].includes("+")) {
        newRecipient = split[0] + "@" + split[1];
      } else {
        newRecipient = split[0] + "+" + conversationId + "@" + split[1];
      }

      await sendEmail(
        {
          From: `${event.name} <response+${conversationId}+${event.slug}@geteventpilot.com>`,
          ReplyTo: newRecipient,
          To: parseResult.data.to,
          Subject: conversation.inboundEmails[0].subject,
          TextBody:
            parseResult.data.message +
            `\n\n\n---\nThis message was sent from EventPilot by ${req.user.name} on behalf of ${event.name}.`,
          Headers: [
            {
              Name: "References",
              Value: messageId,
            },
            {
              Name: "In-Reply-To",
              Value: messageId,
            },
          ],
        },
        conversationId
      );

      return res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error(
        "Error in POST /event/:eventId/conversations/:conversationId:",
        error
      );
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
