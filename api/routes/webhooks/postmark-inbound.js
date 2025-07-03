import { uploadFile } from "#file";
import { prisma } from "#prisma";

const subdomainFromEmail = (email) => {
  const parts = email.split("@");
  return parts[1].split(".")[0];
};

const findEPFromToArray = (toArray) =>
  toArray.find((to) => to.Email.includes("geteventpilot.com"));

const extractAllEmails = (body) => [
  body.FromFull,
  ...body.ToFull,
  ...body.CcFull,
  ...body.BccFull,
];

export const post = async (req, res) => {
  console.log(`[${req.id}][WEBHOOK][POSTMARK_INBOUND] received webhook`);
  try {
    const body = req.body;
    let event = null;
    const subdomain = subdomainFromEmail(findEPFromToArray(body.ToFull)?.Email);
    if (subdomain !== "geteventpilot") {
      event = await prisma.event.findUnique({ where: { slug: subdomain } });
    }

    const createdInboundEmail = await prisma.inboundEmail.create({
      data: {
        eventId: event?.id,
        from: {
          create: {
            email: body.FromFull.Email,
            name: body.FromFull.Name,
            mailboxHash: body.FromFull.MailboxHash,
          },
        },
        to: {
          createMany: {
            data: body.ToFull.map((to) => ({
              email: to.Email,
              name: to.Name,
              mailboxHash: to.MailboxHash,
            })),
          },
        },
        cc: {
          createMany: {
            data: body.CcFull.map((cc) => ({
              email: cc.Email,
              name: cc.Name,
              mailboxHash: cc.MailboxHash,
            })),
          },
        },
        bcc: {
          createMany: {
            data: body.BccFull.map((bcc) => ({
              email: bcc.Email,
              name: bcc.Name,
              mailboxHash: bcc.MailboxHash,
            })),
          },
        },
        headers: {
          createMany: {
            data: body.Headers.map((h) => ({ key: h.Name, value: h.Value })),
          },
        },
        originalRecipient: body.OriginalRecipient,
        subject: body.Subject,
        messageId: body.MessageID,
        replyTo: body.ReplyTo,
        mailboxHash: body.MailboxHash,
        receivedAt: new Date(body.Date),
        textBody: body.TextBody,
        htmlBody: body.HtmlBody,
        strippedTextReply: body.StrippedTextReply,
        tag: body.Tag,
        logs: {
          create: {
            type: "EMAIL_WEBHOOK_RECEIVED",
            eventId: event?.id,
            data: JSON.stringify(body),
          },
        },
      },
    });

    // Attachments
    const attachments = body.Attachments;
    if (attachments?.length) {
      for (const attachment of attachments) {
        try {
          const { Name, Content, ContentType, ContentLength } = attachment;
          const inboundEmailAttachment =
            await prisma.inboundEmailAttachment.create({
              data: { inboundEmailId: createdInboundEmail.id },
            });
          await uploadFile({
            name: Name,
            file: Content,
            contentType: ContentType,
            contentLength: ContentLength,
            inboundEmailAttachmentId: inboundEmailAttachment.id,
          });
        } catch (err) {
          console.error(`[${req.id}] error uploading attachment:`, err);
        }
      }
    }

    if (event?.id) {
      // —— CRM person relationships ——
      const emailObjs = extractAllEmails(body);
      const distinctEmails = Array.from(
        new Set(emailObjs.map((e) => e.Email.toLowerCase()))
      );

      // 1) Find existing CrmPersonEmail records
      const existingEmailRecs = await prisma.crmPersonEmail.findMany({
        where: { email: { in: distinctEmails, mode: "insensitive" } },
        include: { crmPerson: true },
      });

      // 2) Connect inbound email to each matched CrmPerson
      const matchedPersonIds = Array.from(
        new Set(existingEmailRecs.map((r) => r.crmPersonId))
      );
      console.log("Matched persons", matchedPersonIds.length);
      for (const personId of matchedPersonIds) {
        await prisma.crmPerson.update({
          where: { id: personId },
          data: {
            inboundEmails: { connect: { id: createdInboundEmail.id } },
            logs: {
              create: {
                type: "EMAIL_WEBHOOK_RECEIVED",
                eventId: event?.id,
                data: JSON.stringify(body),
                inboundEmailId: createdInboundEmail.id,
              },
            },
          },
        });
      }

      // 3) Create new CrmPerson for addresses not matched
      const matchedEmailSet = new Set(
        existingEmailRecs.map((r) => r.email.toLowerCase())
      );
      const newEmailObjs = emailObjs.filter(
        (e) => !matchedEmailSet.has(e.Email.toLowerCase())
      );

      for (const { Email, Name } of newEmailObjs) {
        console.log("New emails", newEmailObjs.length);
        const personName = Name?.trim() || Email;
        await prisma.crmPerson.create({
          data: {
            name: personName,
            source: "EMAIL",
            event: event ? { connect: { id: event.id } } : undefined,
            emails: { create: { email: Email } },
            inboundEmails: {
              connect: { id: createdInboundEmail.id },
            },
            logs: {
              createMany: {
                data: [
                  {
                    type: "CRM_PERSON_CREATED",
                    eventId: event?.id,
                  },
                  {
                    type: "EMAIL_WEBHOOK_RECEIVED",
                    eventId: event?.id,
                    inboundEmailId: createdInboundEmail.id,
                    data: JSON.stringify(body),
                  },
                ],
              },
            },
          },
        });
      }
    }

    console.log(`[${req.id}] processed inbound email`, createdInboundEmail.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[${req.id}] error in inbound email handler:`, err);
    return res.status(500).json({ error: "internal error" });
  }
};
