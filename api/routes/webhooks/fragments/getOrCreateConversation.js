import { prisma } from "#prisma";

export const getOrCreateConversation = async (eventId, mailboxHash) => {
  let conversation = null;
  let shouldSendConfirmation = false;

  if (mailboxHash && mailboxHash.length > 0) {
    // Prefer deterministic id based on mailboxHash (e.g., Gmail threadId or EP hash)
    conversation = await prisma.conversation
      .upsert({
        where: { id: mailboxHash },
        update: {},
        create: { id: mailboxHash, event: { connect: { id: eventId } } },
      })
      .catch(async () => {
        // Fallback: if id is taken for some reason, create a new one
        shouldSendConfirmation = true;
        return prisma.conversation.create({
          data: { event: { connect: { id: eventId } } },
        });
      });
  } else {
    conversation = await prisma.conversation.create({
      data: { event: { connect: { id: eventId } } },
    });
    shouldSendConfirmation = true;
  }

  return { conversation, shouldSendConfirmation };
};
