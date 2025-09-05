import { prisma } from "#prisma";
import { parseAddressList } from "./createInboundEmailFromGmail.js";
import { upsertConversationCrmPerson } from "#util/upsertConversationCrmPerson";

export const createOutboundEmailFromGmail = async (
  { eventId, conversationId, message, connectionEmail, userId },
  reqId = ""
) => {
  const from = message.headers.from || connectionEmail || "";
  const to = message.headers.to || "";
  const cc = message.headers.cc || "";
  const bcc = message.headers.bcc || "";

  const toList = parseAddressList(to);
  const ccList = parseAddressList(cc);
  const bccList = parseAddressList(bcc);

  const allRecipients = [...toList, ...ccList, ...bccList];

  // Choose a primary crmPerson match if any
  let primaryCrmPersonId = null;
  for (const rec of allRecipients) {
    const match = await prisma.crmPersonEmail.findFirst({
      where: {
        email: { equals: rec.Email, mode: "insensitive" },
        crmPerson: { eventId },
      },
      select: { crmPersonId: true },
    });
    if (match?.crmPersonId) {
      primaryCrmPersonId = match.crmPersonId;
      break;
    }
  }

  // Create Email (outbound)
  const email = await prisma.email.create({
    data: {
      conversation: { connect: { id: conversationId } },
      messageId: message.headers.messageId || message.id,
      from,
      to,
      subject: message.headers.subject || "",
      htmlBody: message.htmlBody || null,
      textBody: message.textBody || null,
      userId: userId || null,
      crmPersonId: primaryCrmPersonId || null,
      createdAt: message.internalDate || undefined,
      logs: {
        create: {
          type: "EMAIL_SENT",
          eventId,
        },
      },
    },
  });

  // Ensure conversation participants include recipients
  for (const rec of allRecipients) {
    try {
      await upsertConversationCrmPerson(rec.Email, conversationId, eventId);
    } catch (err) {
      console.error(`[${reqId}] upsertConversationCrmPerson failed`, err);
    }
  }

  return email;
};
