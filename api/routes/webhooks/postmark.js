import { prisma } from "#prisma";
import { EmailStatus, LogType } from "@prisma/client";

const switchRecordType = {
  Bounce: "BOUNCE",
  Delivery: "DELIVERY",
  Open: "OPEN",
  SpamComplaint: "SPAM_COMPLAINT",
  Click: "LINK_CLICK",
};

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"] || null;

const resolveLifecycleLogType = (recordType) => {
  const key = recordType ? `EMAIL_WEBHOOK_${recordType}` : null;
  return key && LogType[key] ? LogType[key] : null;
};

export const post = async (req, res) => {
  const { RecordType: recordType = "" } = req.body || {};

  console.log(
    `[${req.id}][WEBHOOK][POSTMARK] received webhook of type ${recordType}`
  );

  const messageId = req.body?.MessageID;

  const email = await prisma.email.findFirst({
    where: { messageId },
    select: {
      id: true,
      userId: true,
      crmPersonId: true,
      campaignId: true,
      campaign: {
        select: {
          id: true,
          mailingListId: true,
          eventId: true,
        },
      },
    },
  });

  const statusUpdate = (() => {
    switch (recordType) {
      case "Open":
        return { opened: true, status: EmailStatus.OPENED };
      case "Bounce":
        return { status: EmailStatus.BOUNCED };
      case "Delivery":
        return { status: EmailStatus.DELIVERED };
      case "SpamComplaint":
        return { status: EmailStatus.BOUNCED };
      default:
        return null;
    }
  })();

  if (statusUpdate && messageId) {
    await prisma.email.updateMany({
      where: { messageId },
      data: statusUpdate,
    });
  }

  const webhookType = switchRecordType[recordType];

  if (!webhookType) {
    console.log(
      `[${req.id}][WEBHOOK][POSTMARK] Unknown RecordType received: ${recordType}`
    );
  }

  let emailWebhook = null;
  if (email && webhookType) {
    emailWebhook = await prisma.emailWebhooks.create({
      data: {
        messageId,
        emailId: email.id,
        data: JSON.stringify(req.body),
        type: webhookType,
      },
    });
  }

  const baseLog = {
    userId: email?.userId ?? null,
    crmPersonId: email?.crmPersonId ?? null,
    campaignId: email?.campaignId ?? null,
    mailingListId: email?.campaign?.mailingListId ?? null,
    eventId: email?.campaign?.eventId ?? null,
    emailId: email?.id ?? null,
    emailWebookId: emailWebhook?.id ?? null,
    ip: ipAddress(req),
    data: {
      payload: req.body,
      messageId,
    },
  };

  const logEntries = [];

  logEntries.push({
    ...baseLog,
    type: LogType.EMAIL_WEBHOOK_RECEIVED,
  });

  const lifecycleLogType = resolveLifecycleLogType(webhookType);
  if (lifecycleLogType) {
    logEntries.push({
      ...baseLog,
      type: lifecycleLogType,
    });
  }

  if (logEntries.length) {
    await prisma.logs.createMany({ data: logEntries });
  }

  if (!email) {
    console.log(`[${req.id}][WEBHOOK][POSTMARK] Email not found for ${messageId}`);
  }

  await res.status(200).json({ message: "Webhook received" });
};
