import { prisma } from "#prisma";

export const handleForwardingConfirmation = async (
  body,
  event,
  inboundEmailId,
  reqId,
  res
) => {
  if (
    body.Subject.includes("Gmail Forwarding Confirmation") &&
    body.From === "forwarding-noreply@google.com"
  ) {
    console.log(
      `[${reqId}][WEBHOOK][POSTMARK_INBOUND] email is a forwarding confirmation`
    );
    if (!event) {
      console.log(
        `[${reqId}][WEBHOOK][POSTMARK_INBOUND] no event found for confirmation`
      );
      res.status(200).json({ success: true });
      return true;
    }
    const unescapedBody = body.TextBody.replaceAll("\n", " ");
    const match = unescapedBody.match(
      /https:\/\/(?:mail-settings|mail)\.google\.com\/mail(?:\/u\/\d+)?\/\S+/
    );
    const url = match ? match[0] : null;
    if (!url)
      console.log(
        `[${reqId}][WEBHOOK][POSTMARK_INBOUND] no url found in confirmation email`
      );
    await prisma.event.update({
      where: { id: event.id },
      data: {
        forwardEmailConfirmed: true,
        forwardEmailConfirmationEmailId: inboundEmailId,
        forwardEmailConfirmationLink: url,
      },
    });
    res.status(200).json({ success: true });
    return true;
  }
  return false;
};
