import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

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
