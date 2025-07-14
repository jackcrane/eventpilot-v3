import { prisma } from "#prisma";

export const getOrCreateConversation = async (eventId, mailboxHash) => {
  let conversation = null;
  let shouldSendConfirmation = false;

  if (mailboxHash && mailboxHash.length > 0) {
    conversation = await prisma.conversation.findUnique({
      where: { id: mailboxHash },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { event: { connect: { id: eventId } } },
      });
      shouldSendConfirmation = true;
    }
  } else {
    conversation = await prisma.conversation.create({
      data: { event: { connect: { id: eventId } } },
    });
    shouldSendConfirmation = true;
  }

  return { conversation, shouldSendConfirmation };
};
