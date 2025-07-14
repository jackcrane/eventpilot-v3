import { sendEmail } from "#postmark";

export const sendAutoResponseIfNeeded = async (
  body,
  event,
  conversationId,
  shouldSendConfirmation
) => {
  if (!shouldSendConfirmation) return;
  const messageId = body.Headers.find(
    (h) => h.Name.toLowerCase() === "message-id"
  )?.Value;
  const [local, domain] = body.OriginalRecipient.split("@");
  const newRecipient = `${local}+${conversationId}@${domain}`;
  await sendEmail(
    {
      From: `${event.name} <response+${conversationId}+${event.slug}@geteventpilot.com>`,
      ReplyTo: newRecipient,
      To: body.FromFull.Email,
      Subject: body.Subject,
      TextBody:
        "We have received your email and will be in touch with you shortly.",
      Headers: [
        { Name: "References", Value: messageId },
        { Name: "In-Reply-To", Value: messageId },
      ],
    },
    conversationId,
    true
  );
};

export const sendFailureResponse = async (body) => {
  const messageId = body.Headers.find(
    (h) => h.Name.toLowerCase() === "message-id"
  )?.Value;
  const [local, domain] = body.OriginalRecipient.split("@");
  const newRecipient = `${local}@${domain}`;
  await sendEmail(
    {
      From: `EventPilot Notifier <response@event.geteventpilot.com>`,
      ReplyTo: newRecipient,
      To: body.FromFull.Email,
      Subject: body.Subject,
      TextBody:
        "You attempted to send an email to an event that is using EventPilot, but we were unable to find an EventPilot event for this email. Please double-check the email address and try again, or reach out to support@geteventpilot.com if you have any questions.",
      Headers: [
        { Name: "References", Value: messageId },
        { Name: "In-Reply-To", Value: messageId },
      ],
    },
    null,
    true
  );
};
