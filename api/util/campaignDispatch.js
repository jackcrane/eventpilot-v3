import { prisma } from "#prisma";
import { rawEmailClient } from "#postmark";
import { render } from "@react-email/render";
import CampaignBlastEmail from "#emails/campaign-blast.jsx";
import { renderEmailTemplate, isTemplateEmpty } from "./emailTemplates.js";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import cuid from "cuid";

const MAX_POSTMARK_BATCH = 500;
const TEST_DOMAIN_PATTERN = /@(?:example\.com|eventpilot-test\.com)$/i;

const memberInclude = {
  include: {
    crmPerson: {
      select: {
        id: true,
        name: true,
        deleted: true,
        emails: {
          where: { deleted: false },
          select: { id: true, email: true, deleted: true },
        },
      },
    },
  },
};

const sanitizeDisplayName = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[<>]/g, "");

const resolveFromAddress = (event) => {
  const label = sanitizeDisplayName(event?.name || "EventPilot");
  return `${label} <no-reply@events.geteventpilot.com>`;
};

const resolveReplyTo = () => "no-reply@events.geteventpilot.com";

const choosePersonEmail = (person) => {
  if (!person) return null;
  if (Array.isArray(person.emails) && person.emails.length) {
    const active = person.emails.find(
      (entry) => entry?.email && !entry.deleted
    );
    if (active) return active;
    const any = person.emails.find((entry) => entry?.email);
    if (any) return any;
  }
  return null;
};

const chunk = (items, size = MAX_POSTMARK_BATCH) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const markCampaignStarted = async (campaignId) => {
  const result = await prisma.campaign.updateMany({
    where: { id: campaignId, sendEffortStarted: false },
    data: { sendEffortStarted: true },
  });
  return result.count > 0;
};

const resetCampaignStarted = async (campaignId) => {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { sendEffortStarted: false },
  });
};

const appendTextUnsubscribe = (textBody, unsubscribeUrl) => {
  const clean = (textBody || "").trim();
  if (!unsubscribeUrl) return clean;
  if (clean.includes(unsubscribeUrl)) return clean;
  const suffix = clean ? "\n\n" : "";
  return `${clean}${suffix}Unsubscribe: ${unsubscribeUrl}`;
};

const segmentsToPlainText = (segments) => {
  if (!Array.isArray(segments) || !segments.length) {
    return "";
  }

  const normalized = segments
    .map((lines) =>
      Array.isArray(lines)
        ? lines
            .map((tokens) => {
              if (!Array.isArray(tokens) || !tokens.length) return "";
              const line = tokens
                .map((token) => {
                  if (!token) return "";
                  if (token.type === "link") {
                    return token.label || token.href || "";
                  }
                  if (typeof token.value === "string") {
                    return token.value;
                  }
                  return "";
                })
                .join("");
              return line.trim();
            })
            .filter(Boolean)
            .join("\n")
        : ""
    )
    .filter(Boolean);

  return normalized.join("\n\n");
};

const createEmailRecord = async ({
  to,
  from,
  subject,
  campaignId,
  userId,
  crmPersonId,
  crmPersonEmailId,
}) =>
  prisma.email.create({
    data: {
      messageId: `pending-${cuid()}`,
      from,
      to,
      subject,
      textBody: null,
      htmlBody: null,
      campaignId,
      userId: userId || null,
      crmPersonId: crmPersonId || null,
      crmPersonEmailId: crmPersonEmailId || null,
    },
  });

export const dispatchCampaign = async ({
  campaignId,
  initiatedByUserId = null,
  reqId = "cron",
} = {}) => {
  if (!campaignId) {
    throw new Error("campaignId is required");
  }

  console.log("Campaign dispatch triggered");

  const logPrefix = `[${reqId || "campaign"}][campaign:${campaignId}]`;

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          contactEmail: true,
          externalContactEmail: true,
          banner: { select: { location: true } },
          logo: { select: { location: true } },
        },
      },
      template: {
        select: { id: true, name: true, textBody: true, deleted: true },
      },
      mailingList: {
        select: { id: true, title: true, deleted: true },
      },
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (campaign.template?.deleted) {
    throw new Error("Template has been deleted");
  }

  if (campaign.mailingList?.deleted) {
    throw new Error("Mailing list has been deleted");
  }

  if (isTemplateEmpty(campaign.template?.textBody || "")) {
    throw new Error("Template body is empty");
  }

  const locked = await markCampaignStarted(campaignId);
  if (!locked) {
    return {
      campaignId,
      sent: 0,
      skipped: [],
      alreadyStarted: true,
    };
  }

  const summary = {
    campaignId,
    sent: 0,
    skipped: [],
    alreadyStarted: false,
  };

  try {
    const members = await prisma.mailingListMember.findMany({
      where: {
        mailingListId: campaign.mailingListId,
        deleted: false,
        status: MailingListMemberStatus.ACTIVE,
        crmPerson: { deleted: false },
      },
      ...memberInclude,
    });

    if (!members.length) {
      return summary;
    }

    const fromAddress = resolveFromAddress(campaign.event);
    const replyTo = resolveReplyTo(campaign.event);
    const subject = campaign.name || campaign.template?.name || "Event Update";

    const prepared = [];

    for (const member of members) {
      const person = member?.crmPerson;
      if (!person || person.deleted) {
        summary.skipped.push({
          memberId: member?.id,
          reason: "PERSON_MISSING",
        });
        continue;
      }

      const personEmail = choosePersonEmail(person);
      if (!personEmail?.email) {
        summary.skipped.push({
          memberId: member.id,
          crmPersonId: person.id,
          reason: "EMAIL_MISSING",
        });
        continue;
      }

      const toAddress = person.name
        ? `${sanitizeDisplayName(person.name)} <${personEmail.email}>`
        : personEmail.email;

      const record = await createEmailRecord({
        to: toAddress,
        from: fromAddress,
        subject,
        campaignId: campaign.id,
        userId: initiatedByUserId,
        crmPersonId: person.id,
        crmPersonEmailId: personEmail.id,
      });

      const unsubscribeUrl = `https://geteventpilot.com/unsubscribe?p=${person.id}&e=${record.id}`;
      const merged = renderEmailTemplate(campaign.template?.textBody || "", {
        event: campaign.event,
        campaign,
        person,
        personEmail,
        emailAddress: personEmail.email,
        unsubscribeUrl,
      });

      const htmlEmail = await render(
        CampaignBlastEmail.CampaignBlastEmail({
          event: campaign.event,
          subject,
          contentSegments: merged.htmlSegments,
          unsubscribeUrl,
        })
      );

      const textSource =
        merged.text || segmentsToPlainText(merged.htmlSegments) || "";
      const textEmail = appendTextUnsubscribe(textSource, unsubscribeUrl);
      const isMock = TEST_DOMAIN_PATTERN.test(personEmail.email);

      if (isMock) {
        console.log(
          `${logPrefix} Mock email to ${personEmail.email} (member ${member.id})`
        );
      }

      prepared.push({
        emailId: record.id,
        crmPersonId: person.id,
        mailingListMemberId: member.id,
        to: toAddress,
        subject,
        htmlBody: htmlEmail,
        textBody: textEmail,
        unsubscribeUrl,
        isMock,
      });
    }

    if (!prepared.length) {
      return summary;
    }

    const responses = new Array(prepared.length);
    const realIndices = [];
    const realMessages = [];

    prepared.forEach((entry, index) => {
      if (entry.isMock) {
        responses[index] = { MessageID: `mock-${Date.now()}-${index}` };
        return;
      }
      realIndices.push(index);
      realMessages.push({
        From: fromAddress,
        To: entry.to,
        Subject: entry.subject,
        HtmlBody: entry.htmlBody,
        TextBody: entry.textBody,
        MessageStream: "broadcast",
        ...(replyTo ? { ReplyTo: replyTo } : {}),
      });
    });

    if (realMessages.length) {
      const chunks = chunk(realMessages, MAX_POSTMARK_BATCH);
      const realResponses = [];
      for (const batch of chunks) {
        const res = await rawEmailClient.sendEmailBatch(batch);
        realResponses.push(...res);
      }

      let pointer = 0;
      for (const originalIndex of realIndices) {
        responses[originalIndex] = realResponses[pointer++] || {
          MessageID: `postmark-${Date.now()}-${originalIndex}`,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < prepared.length; i += 1) {
        const entry = prepared[i];
        const response = responses[i] || {};
        const messageId = response.MessageID || `mock-${Date.now()}-${i}`;

        await tx.email.update({
          where: { id: entry.emailId },
          data: {
            messageId,
            htmlBody: entry.htmlBody,
            textBody: entry.textBody,
          },
        });

        await tx.logs.create({
          data: {
            type: LogType.EMAIL_SENT,
            userId: initiatedByUserId || null,
            emailId: entry.emailId,
            crmPersonId: entry.crmPersonId,
            campaignId: campaign.id,
            mailingListId: campaign.mailingListId,
            eventId: campaign.event.id,
            data: { unsubscribeUrl: entry.unsubscribeUrl },
          },
        });
      }
    });

    console.log(`${logPrefix} Dispatched ${prepared.length} emails`);

    summary.sent = prepared.length;
    return summary;
  } catch (error) {
    console.error(`${logPrefix} Failed to dispatch campaign:`, error);
    await resetCampaignStarted(campaignId);
    throw error;
  }
};
