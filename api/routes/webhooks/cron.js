import { prisma } from "#prisma";
import { sendEmail } from "#postmark";
import { render } from "@react-email/render";
import DailyDigestEmail from "#emails/daily-digest.jsx";
import { dispatchCampaign } from "#util/campaignDispatch";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import cuid from "cuid";
import { reportApiError } from "#util/reportApiError.js";
// Gmail ingestion logic factored into reusable helper
import { ingestGmailWindowForEvent } from "./fragments/ingestGmailWindow.js";
import { evaluateSegment } from "../events/[eventId]/crm/segments/index.js";
import { memberInclude } from "../events/[eventId]/mailing-lists/memberUtils.js";
import { getNextInstance } from "#util/getNextInstance";
import { createLogBuffer } from "../../util/logging.js";

const savedSegmentSelection = {
  id: true,
  ast: true,
  deleted: true,
};

const resolveDefaultInstanceId = async (eventId) => {
  const instances = await prisma.eventInstance.findMany({
    where: { eventId, deleted: false },
    orderBy: { startTime: "asc" },
  });

  if (!instances.length) return null;

  const nextInstance = await getNextInstance(eventId);
  if (nextInstance) return nextInstance.id;

  const now = new Date();

  const future = instances
    .filter((instance) => instance?.startTime && instance.startTime >= now)
    .sort((a, b) => a.startTime - b.startTime);
  if (future.length) return future[0].id;

  const pastByEnd = instances
    .filter((instance) => instance?.endTime && instance.endTime < now)
    .sort((a, b) => b.endTime - a.endTime);
  if (pastByEnd.length) return pastByEnd[0].id;

  const pastByStart = instances
    .filter((instance) => instance?.startTime && instance.startTime < now)
    .sort((a, b) => b.startTime - a.startTime);
  if (pastByStart.length) return pastByStart[0].id;

  return instances[instances.length - 1].id;
};

const syncAiMailingLists = async ({ reqId } = {}) => {
  const lists = await prisma.mailingList.findMany({
    where: {
      deleted: false,
      crmSavedSegmentId: { not: null },
      event: { deleted: false },
      crmSavedSegment: { deleted: false },
    },
    select: {
      id: true,
      eventId: true,
      crmSavedSegmentId: true,
      crmSavedSegment: { select: savedSegmentSelection },
    },
  });

  if (!lists.length) return;

  const instanceCache = new Map();

  const getInstanceId = async (eventId) => {
    if (instanceCache.has(eventId)) return instanceCache.get(eventId);
    const resolved = await resolveDefaultInstanceId(eventId);
    instanceCache.set(eventId, resolved ?? null);
    return resolved ?? null;
  };

  for (const list of lists) {
    try {
      const segment = list.crmSavedSegment;
      if (!segment?.ast?.filter) continue;

      const currentInstanceId = await getInstanceId(list.eventId);

      const evaluation = await evaluateSegment({
        eventId: list.eventId,
        currentInstanceId,
        filter: segment.ast.filter,
        debug: false,
        pagination: {},
      });

      const people = Array.isArray(evaluation?.crmPersons)
        ? evaluation.crmPersons
        : [];
      if (!people.length) {
        await prisma.crmSavedSegment.update({
          where: { id: list.crmSavedSegmentId },
          data: { lastUsed: new Date() },
        });
        continue;
      }

      const uniqueIds = Array.from(
        new Set(
          people
            .map((person) => person?.id)
            .filter((id) => typeof id === "string" && id.length)
        )
      );

      if (!uniqueIds.length) continue;

      const existingMembers = await prisma.mailingListMember.findMany({
        where: {
          mailingListId: list.id,
          crmPersonId: { in: uniqueIds },
        },
        select: { crmPersonId: true },
      });
      const existingIds = new Set(
        existingMembers.map((member) => member.crmPersonId)
      );

      const idsToCreate = uniqueIds.filter((id) => !existingIds.has(id));

      const now = new Date();
      const createRows = idsToCreate.map((crmPersonId) => ({
        id: cuid(),
        mailingListId: list.id,
        crmPersonId,
        status: MailingListMemberStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }));

      const logBuffer = createLogBuffer();

      await prisma.$transaction(async (tx) => {
        if (createRows.length) {
          await tx.mailingListMember.createMany({
            data: createRows,
            skipDuplicates: true,
          });

          const createdMembers = await tx.mailingListMember.findMany({
            where: { id: { in: createRows.map((row) => row.id) } },
            ...memberInclude,
          });

          if (createdMembers.length) {
            logBuffer.pushMany(
              createdMembers.map((member) => ({
                type: LogType.MAILING_LIST_MEMBER_CREATED,
                userId: null,
                ip: null,
                eventId: list.eventId,
                mailingListId: list.id,
                mailingListMemberId: member.id,
                crmPersonId: member.crmPersonId,
                crmSavedSegmentId: list.crmSavedSegmentId,
                data: { before: null, after: member },
              }))
            );
          }
        }

        if (list.crmSavedSegmentId) {
          await tx.crmSavedSegment.update({
            where: { id: list.crmSavedSegmentId },
            data: { lastUsed: new Date() },
          });
        }
      });

      if (logBuffer.size) {
        await logBuffer.flush();
      }
    } catch (error) {
      console.error(
        `[${reqId || "cron"}] [CRON][MAILING_LIST_AI] Failed for list ${list.id}:`,
        error
      );
    }
  }
};

const dispatchDueCampaigns = async ({ reqId } = {}) => {
  const now = new Date();
  const due = await prisma.campaign.findMany({
    where: {
      sendEffortStarted: false,
      OR: [
        { sendImmediately: true },
        {
          sendImmediately: false,
          sendAt: { not: null, lte: now },
        },
      ],
      template: { deleted: false },
      mailingList: { deleted: false },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!due.length) return;

  for (const campaign of due) {
    try {
      await dispatchCampaign({ campaignId: campaign.id, reqId });
    } catch (error) {
      console.error(
        `[${reqId || "cron"}][CAMPAIGN] Failed to dispatch ${campaign.id}:`,
        error
      );
    }
  }
};

export const post = async (req, res) => {
  try {
    const { frequency } = req.body;

    // 1) Minutely Gmail ingestion (idempotent via messageId)
    // Runs regardless of frequency, but you can scope it if desired
    const gmailConns = await prisma.gmailConnection.findMany({
      select: { eventId: true, email: true },
    });
    for (const conn of gmailConns) {
      try {
        await ingestGmailWindowForEvent({
          eventId: conn.eventId,
          q: "newer_than:1d -in:chats",
          reqId: req.id,
        });
      } catch (err) {
        // If no gmail connection or invalid creds, skip
        const msg = String(err?.message || "");
        if (
          err?.code === "NO_GMAIL_CONNECTION" ||
          msg.includes("invalid_grant") ||
          msg.includes("invalid_credentials")
        ) {
          continue;
        }
        console.error(`[${req.id}] [CRON][GMAIL] error`, err);
      }
    }

    if (frequency === "MINUTELY") {
      const minute = Number(req.body?.minute);
      if (Number.isFinite(minute) && minute % 10 === 0) {
        try {
          await syncAiMailingLists({ reqId: req.id });
        } catch (err) {
          console.error(`[${req.id}] [CRON][MAILING_LIST_AI] error`, err);
        }
      }
    }

    await dispatchDueCampaigns({ reqId: req.id });

    if (frequency === "DAILY") {
      const events = await prisma.event.findMany({
        include: {
          user: true,
        },
      });

      for (const event of events) {
        const newFormResponses = await prisma.volunteerRegistration.count({
          where: {
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            eventId: event.id,
            deleted: false,
          },
        });
        const newCrmPersons = await prisma.crmPerson.count({
          where: {
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            eventId: event.id,
            deleted: false,
          },
        });
        const newEmails = await prisma.inboundEmail.count({
          where: {
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            // read: false,
            eventId: event.id,
            conversation: {
              deleted: false,
            },
          },
        });

        // console.log(
        //   `[HOURLY] EventPilot daily digest for ${event.name}: ${newFormResponses} new form responses, ${newCrmPersons} new CRM persons, and ${newEmails} new emails`
        // );
        await sendEmail({
          From: "EventPilot Daily Digests <daily-digests@geteventpilot.com>",
          To: event.contactEmail || event.user.email,
          Subject: `Your EventPilot ${event.name} Daily Digest for ${new Date().toLocaleDateString()}`,
          HtmlBody: await render(
            DailyDigestEmail.DailyDigestEmail({
              name: event.user.name,
              event,
              newFormResponses,
              newCrmPersons,
              newEmails,
            })
          ),
          userId: event.user.id,
        });
      }
    }

    return res.status(200).json({ message: "Webhook received" });
  } catch (e) {
    console.error("Error in POST /webhooks/cron:", e);
    reportApiError(e, req);
    return res.status(500).json({ error: "Internal server error" });
  }
};
