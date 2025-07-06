import { prisma } from "#prisma";

const switchRecordType = {
  Bounce: "BOUNCE",
  Delivery: "DELIVERY",
  Open: "OPEN",
  SpamComplaint: "SPAM_COMPLAINT",
  Click: "LINK_CLICK",
};

export const post = async (req, res) => {
  console.log(
    `[${req.id}][WEBHOOK][POSTMARK] recieved webhook of type ${req.body.RecordType}`
  );

  const email = await prisma.email.findFirst({
    where: {
      messageId: req.body.MessageID,
    },
  });

  if (req.body.RecordType === "Open") {
    await prisma.email.update({
      where: {
        messageId: req.body.MessageID,
      },
      data: {
        opened: true,
        status: "OPENED",
      },
    });
  } else if (req.body.RecordType === "Bounce") {
    await prisma.email.update({
      where: {
        messageId: req.body.MessageID,
      },
      data: {
        status: "BOUNCED",
      },
    });
  } else if (req.body.RecordType === "Delivery") {
    await prisma.email.update({
      where: {
        messageId: req.body.MessageID,
      },
      data: {
        status: "DELIVERED",
      },
    });
  } else {
    console.log("Unknown RecordType", req.body.RecordType);
  }

  if (email) {
    await prisma.emailWebhooks.create({
      data: {
        messageId: req.body.MessageID,
        emailId: email.id,
        data: JSON.stringify(req.body),
        type: switchRecordType[req.body.RecordType],
        logs: {
          create: {
            data: JSON.stringify(req.body),
            userId: email.userId,
            type: "EMAIL_WEBHOOK_" + switchRecordType[req.body.RecordType],
            crmPersonId: email.crmPersonId,
            eventId: email.eventId,
            emailId: email.id,
          },
        },
      },
    });
  } else {
    console.log(`[${req.id}][WEBHOOK][POSTMARK] Email not found`);
  }

  await res.status(200).json({ message: "Webhook received" });
};
