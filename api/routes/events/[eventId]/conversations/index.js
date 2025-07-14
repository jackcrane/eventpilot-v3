import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { sendEmail } from "#postmark";

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const includeDeleted = req.query.includeDeleted === "true";

    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          eventId,
          deleted: includeDeleted,
          inboundEmails: {
            none: {
              forwardedForEvent: { isNot: null },
            },
          },
        },
        include: {
          inboundEmails: {
            include: {
              from: true,
              to: true,
              cc: true,
              bcc: true,
              attachments: true,
            },
          },
          outboundEmails: true,
        },
      });

      const sortedConversations = conversations.sort((a, b) => {
        const aTimes = [...a.inboundEmails, ...a.outboundEmails].map((e) =>
          e.createdAt.getTime()
        );
        const bTimes = [...b.inboundEmails, ...b.outboundEmails].map((e) =>
          e.createdAt.getTime()
        );
        const aLatest = aTimes.length ? Math.max(...aTimes) : 0;
        const bLatest = bTimes.length ? Math.max(...bTimes) : 0;
        return bLatest - aLatest;
      });

      const result = sortedConversations.map((convo) => {
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

        // Fallback: no participants found, use the oldest email's "to" field
        if (participants.length === 0) {
          const allEmails = [...convo.inboundEmails, ...convo.outboundEmails];
          const oldest = allEmails.reduce(
            (oldest, email) =>
              !oldest || email.createdAt < oldest.createdAt ? email : oldest,
            null
          );
          if (!oldest) return null;
          const fallbackEmail = oldest?.to;
          if (fallbackEmail) {
            participants = [
              {
                id: fallbackEmail,
                email: fallbackEmail,
                name: fallbackEmail,
              },
            ];
          }
        }

        const allEmails = [...convo.inboundEmails, ...convo.outboundEmails];
        const emailCount = allEmails.length;
        const mostRecent = allEmails.reduce(
          (latest, email) =>
            !latest || email.createdAt > latest.createdAt ? email : latest,
          null
        );
        const mostRecentStatus =
          mostRecent && convo.inboundEmails.some((e) => e.id === mostRecent.id)
            ? "RECEIVED"
            : (mostRecent?.status ?? null);

        const bodies = allEmails
          .flatMap((email) => [email.textBody ?? null, email.htmlBody ?? null])
          .filter(Boolean);
        const subject = mostRecent?.subject ?? null;
        const hasUnread = convo.inboundEmails.some((email) => !email.read);
        const hasAttachments = convo.inboundEmails.some(
          (email) => email.attachments?.length > 0
        );
        const lastActivityAt = mostRecent?.createdAt ?? null;

        // eslint-disable-next-line
        const { inboundEmails, outboundEmails, ...rest } = convo;
        return {
          ...rest,
          participants,
          emailCount,
          subject,
          hasUnread,
          hasAttachments,
          lastActivityAt,
          bodies,
          mostRecentStatus,
          sent: mostRecentStatus !== "RECEIVED",
        };
      });

      res.json({ conversations: result.filter(Boolean) });
    } catch (error) {
      console.error("Error in GET /event/:eventId/conversations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const parseResult = sendSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ message: serializeError(parseResult.error) });
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          slug: true,
          name: true,
        },
      });

      const { to, subject, text, html } = parseResult.data;

      const conversation = await prisma.conversation.create({
        data: {
          event: {
            connect: {
              id: eventId,
            },
          },
        },
      });

      await sendEmail(
        {
          From: `${event.name} <response+${conversation.id}+${event.slug}@event.geteventpilot.com>`,
          To: to,
          Subject: subject,
          TextBody: text,
          HtmlBody: html,
          userId: req.user.id,
        },
        conversation.id
      );

      return res.json({ message: "Message sent successfully", conversation });
    } catch (error) {
      console.error("Error in POST /event/:eventId/conversations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
