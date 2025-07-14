import { prisma } from "#prisma";

export const createInboundEmail = async (body, eventId, conversationId) => {
  return await prisma.inboundEmail.create({
    data: {
      event: { connect: { id: eventId } },
      from: {
        create: {
          email: body.FromFull.Email,
          name: body.FromFull.Name,
          mailboxHash: body.FromFull.MailboxHash,
        },
      },
      to: {
        createMany: {
          data: body.ToFull.map((to) => ({
            email: to.Email,
            name: to.Name,
            mailboxHash: to.MailboxHash,
          })),
        },
      },
      cc: {
        createMany: {
          data: body.CcFull.map((cc) => ({
            email: cc.Email,
            name: cc.Name,
            mailboxHash: cc.MailboxHash,
          })),
        },
      },
      bcc: {
        createMany: {
          data: body.BccFull.map((bcc) => ({
            email: bcc.Email,
            name: bcc.Name,
            mailboxHash: bcc.MailboxHash,
          })),
        },
      },
      headers: {
        createMany: {
          data: body.Headers.map((h) => ({
            key: h.Name,
            value: h.Value,
          })),
        },
      },
      conversation: { connect: { id: conversationId } },
      originalRecipient: body.OriginalRecipient,
      subject: body.Subject,
      messageId: body.MessageID,
      replyTo: body.ReplyTo,
      mailboxHash: body.MailboxHash,
      receivedAt: new Date(body.Date),
      textBody: body.TextBody,
      htmlBody: body.HtmlBody,
      strippedTextReply: body.StrippedTextReply,
      tag: body.Tag,
      logs: {
        create: {
          type: "EMAIL_WEBHOOK_RECEIVED",
          eventId,
          data: JSON.stringify(body),
        },
      },
    },
  });
};
