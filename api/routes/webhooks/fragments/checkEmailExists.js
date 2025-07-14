import { prisma } from "#prisma";

export const checkEmailExists = async (body, reqId) => {
  const message = await prisma.email.findFirst({
    where: { messageId: body.MessageID },
  });
  if (message) {
    console.log(`[${reqId}][WEBHOOK][POSTMARK_INBOUND] email already in db`);
    return true;
  }
  return false;
};
