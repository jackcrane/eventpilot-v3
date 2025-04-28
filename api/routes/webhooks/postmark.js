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

  if (email) {
    await prisma.emailWebhooks.create({
      data: {
        messageId: req.body.MessageID,
        emailId: email.id,
        data: JSON.stringify(req.body),
        type: switchRecordType[req.body.RecordType],
      },
    });
  } else {
    console.log(`[${req.id}][WEBHOOK][POSTMARK] Email not found`);
  }

  await res.status(200).json({ message: "Webhook received" });
};
