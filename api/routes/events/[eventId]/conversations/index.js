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
        where: { eventId, deleted: includeDeleted },
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

      // sort by most recent email activity
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
        // dedupe participants by email address
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

        const allEmails = [...convo.inboundEmails, ...convo.outboundEmails];
        const emailCount = allEmails.length;
        const mostRecent = allEmails.reduce(
          (latest, email) =>
            !latest || email.createdAt > latest.createdAt ? email : latest,
          null
        );
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
        };
      });

      res.json({ conversations: result });
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

      return res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Error in POST /event/:eventId/conversations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
