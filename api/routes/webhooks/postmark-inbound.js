import {
  checkEmailExists,
  resolveEvent,
  getOrCreateConversation,
  createInboundEmail,
  uploadAttachments,
  handleForwardingConfirmation,
  processCrmPersonRelationships,
  sendAutoResponseIfNeeded,
  sendFailureResponse,
} from "./fragments";
import { sendEmailEvent } from "#sse";

export const post = async (req, res) => {
  console.log(`[${req.id}][WEBHOOK][POSTMARK_INBOUND] received webhook`);
  try {
    const body = req.body;

    if (await checkEmailExists(body, req.id)) {
      return res.status(200).json({ success: true });
    }

    const event = await resolveEvent(body);
    console.log(`[${req.id}][WEBHOOK][POSTMARK_INBOUND] resolved event`, event);

    if (!event) {
      console.log("Email did not resolve to an event");
      await sendFailureResponse(body);
      return res.status(200).json({ success: true });
    }

    const { conversation, shouldSendConfirmation } =
      await getOrCreateConversation(event?.id, body.MailboxHash);

    const createdInboundEmail = await createInboundEmail(
      body,
      event?.id,
      conversation.id
    );

    await uploadAttachments(createdInboundEmail.id, body.Attachments, req.id);

    if (
      await handleForwardingConfirmation(
        body,
        event,
        createdInboundEmail.id,
        req.id,
        res
      )
    ) {
      return;
    }

    if (event?.id) {
      await processCrmPersonRelationships(
        body,
        event.id,
        createdInboundEmail.id,
        conversation.id
      );
      await sendAutoResponseIfNeeded(
        body,
        event,
        createdInboundEmail.conversationId,
        shouldSendConfirmation
      );
    }

    sendEmailEvent(event.id, createdInboundEmail);

    console.log(`[${req.id}] processed inbound email`, createdInboundEmail.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[${req.id}] error in inbound email handler:`, err);
    return res.status(500).json({ error: "internal error" });
  }
};
