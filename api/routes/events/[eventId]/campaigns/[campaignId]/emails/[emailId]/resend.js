import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { rawEmailClient } from "#postmark";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import cuid from "cuid";
import { reportApiError } from "#util/reportApiError.js";

const TEST_DOMAIN_PATTERN = /@(?:example\.com|eventpilot-test\.com)$/i;

const sanitizeDisplayName = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[<>]/g, "");

const resolveFromAddress = (event) => {
  const label = sanitizeDisplayName(event?.name || "EventPilot");
  return `${label} <no-reply@event.geteventpilot.com>`;
};

const resolveReplyTo = () => "no-reply@event.geteventpilot.com";

const extractEmailAddress = (value) => {
  if (!value) return "";
  const match = String(value).match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return String(value).trim();
};

const buildUnsubscribeUrl = (personId, emailId) => {
  if (!personId || !emailId) return null;
  return `https://geteventpilot.com/unsubscribe?p=${personId}&e=${emailId}`;
};

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId, emailId } = req.params;

    try {
      const existingEmail = await prisma.email.findFirst({
        where: {
          id: emailId,
          campaignId,
          campaign: { eventId },
        },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          htmlBody: true,
          textBody: true,
          crmPersonId: true,
          crmPersonEmailId: true,
          campaign: {
            select: {
              id: true,
              mailingListId: true,
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!existingEmail) {
        return res.status(404).json({ message: "Email not found" });
      }

      if (!existingEmail.subject || !existingEmail.to) {
        return res
          .status(400)
          .json({ message: "Email is missing required fields" });
      }

      const campaign = existingEmail.campaign;

      if (existingEmail.crmPersonId && campaign?.mailingListId) {
        const membership = await prisma.mailingListMember.findFirst({
          where: {
            mailingListId: campaign.mailingListId,
            crmPersonId: existingEmail.crmPersonId,
            deleted: false,
          },
          select: { status: true },
        });

        if (membership?.status === MailingListMemberStatus.UNSUBSCRIBED) {
          return res.status(409).json({
            message: "This recipient has unsubscribed from the mailing list.",
          });
        }
      }

      const baseHtml = existingEmail.htmlBody || "";
      const baseText = existingEmail.textBody || "";

      if (!baseHtml && !baseText) {
        return res
          .status(400)
          .json({ message: "Original email content is unavailable" });
      }

      if (!campaign) {
        return res
          .status(400)
          .json({ message: "Campaign context is required to resend" });
      }

      const event = campaign.event;
      const fromAddress = existingEmail.from || resolveFromAddress(event);
      const replyTo = resolveReplyTo(event);
      const toAddress = existingEmail.to;
      const recipientEmail = extractEmailAddress(toAddress);

      const created = await prisma.email.create({
        data: {
          messageId: `pending-${cuid()}`,
          from: fromAddress,
          to: toAddress,
          subject: existingEmail.subject,
          campaignId: campaign.id,
          userId: req.user?.id ?? null,
          crmPersonId: existingEmail.crmPersonId,
          crmPersonEmailId: existingEmail.crmPersonEmailId,
        },
      });

      const unsubscribeReplacement = buildUnsubscribeUrl(
        existingEmail.crmPersonId,
        created.id
      );

      let htmlBody = baseHtml;
      let textBody = baseText;

      if (unsubscribeReplacement) {
        const currentUrl = buildUnsubscribeUrl(
          existingEmail.crmPersonId,
          existingEmail.id
        );
        if (currentUrl) {
          const pattern = new RegExp(
            currentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
          );
          if (htmlBody) {
            htmlBody = htmlBody.replace(pattern, unsubscribeReplacement);
          }
          if (textBody) {
            textBody = textBody.replace(pattern, unsubscribeReplacement);
          }
        }
      }

      const payload = {
        From: fromAddress,
        To: toAddress,
        Subject: existingEmail.subject,
        HtmlBody: htmlBody || undefined,
        TextBody: textBody || undefined,
        MessageStream: "broadcast",
        ReplyTo: replyTo,
      };

      const isMock = TEST_DOMAIN_PATTERN.test(recipientEmail);
      let messageId = `mock-${Date.now()}`;

      if (!isMock) {
        try {
          const response = await rawEmailClient.sendEmail(payload);
          messageId = response?.MessageID || messageId;
        } catch (error) {
          await prisma.email.delete({ where: { id: created.id } });
          console.error(
            `Failed to resend email ${emailId} for campaign ${campaignId}:`,
            error
          );
          reportApiError(error, req);
          return res
            .status(500)
            .json({ message: "Failed to dispatch the resend" });
        }
      }

      await prisma.email.update({
        where: { id: created.id },
        data: {
          messageId,
          htmlBody: htmlBody || null,
          textBody: textBody || null,
        },
      });

      await prisma.logs.create({
        data: {
          type: LogType.EMAIL_SENT,
          userId: req.user?.id ?? null,
          emailId: created.id,
          crmPersonId: existingEmail.crmPersonId,
          mailingListId: campaign.mailingListId,
          campaignId: campaign.id,
          eventId,
          data: unsubscribeReplacement
            ? { unsubscribeUrl: unsubscribeReplacement }
            : undefined,
        },
      });

      return res.json({
        email: {
          id: created.id,
          previousEmailId: existingEmail.id,
        },
      });
    } catch (error) {
      console.error(
        `Unexpected error while resending email ${emailId} for campaign ${campaignId}:`,
        error
      );
      reportApiError(error, req);
      return res
        .status(500)
        .json({ message: "Unexpected error while resending email" });
    }
  },
];
