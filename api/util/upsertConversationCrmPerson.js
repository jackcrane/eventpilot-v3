import { prisma } from "#prisma";

export const upsertConversationCrmPerson = async (
  emailAddress,
  conversationId,
  eventId
) => {
  // try to find an existing CrmPerson by email
  const existing = await prisma.crmPerson.findFirst({
    where: {
      emails: {
        some: { email: emailAddress },
      },
      event: { id: eventId },
      deleted: false,
    },
    include: {
      conversations: true,
    },
  });

  if (existing && existing.deleted === false) {
    // if not already linked to the conversation, connect them
    const linked = existing.conversations.some((c) => c.id === conversationId);
    if (!linked) {
      await prisma.conversation.update({
        where: { id: conversationId, event: { id: eventId } },
        data: {
          participants: {
            connect: { id: existing.id },
          },
        },
      });
    }
    return existing;
  }

  // otherwise create a new CrmPerson, add their email, and link to the conversation
  return prisma.crmPerson.create({
    data: {
      name: emailAddress,
      emails: {
        create: { email: emailAddress },
      },
      conversations: {
        connect: { id: conversationId },
      },
      event: { connect: { id: eventId } },
      source: "SENT_EMAIL",
      logs: {
        create: {
          type: "CRM_PERSON_CREATED",
          eventId,
        },
      },
    },
  });
};
