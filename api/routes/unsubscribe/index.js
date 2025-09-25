import { prisma } from "#prisma";
import { z } from "zod";
import {
  EmailStatus,
  LogType,
  MailingListMemberStatus,
} from "@prisma/client";

const querySchema = z.object({
  p: z.string().cuid(),
  e: z.string().cuid(),
});

const bodySchema = z.object({
  personId: z.string().cuid(),
  emailId: z.string().cuid(),
  mailingListIds: z.array(z.string().cuid()).optional(),
  unsubscribeAll: z.boolean().optional().default(false),
});

const shapeResponse = ({
  email,
  campaign,
  person,
  memberships,
}) => {
  const mailingLists = memberships
    .map((membership) => ({
      id: membership.mailingList.id,
      title: membership.mailingList.title,
      status: membership.status,
      membershipId: membership.id,
    }))
    .sort((a, b) => {
      if (a.id === campaign.mailingListId) return -1;
      if (b.id === campaign.mailingListId) return 1;
      return a.title.localeCompare(b.title);
    });

  return {
    unsubscribe: {
      person: {
        id: person?.id ?? null,
        name: person?.name ?? null,
        email: email.crmPersonEmail?.email ?? null,
      },
      email: {
        id: email.id,
        subject: email.subject,
        status: email.status,
        createdAt: email.createdAt,
      },
      campaign: {
        id: campaign.id,
        name: campaign.name,
        mailingListId: campaign.mailingListId,
      },
      event: campaign.event
        ? { id: campaign.event.id, name: campaign.event.name }
        : null,
      mailingLists,
      defaultMailingListId: campaign.mailingListId,
    },
  };
};

const fetchContext = async ({ emailId, personId }) => {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      crmPersonId: true,
      crmPersonEmail: {
        select: { id: true, email: true },
      },
      crmPerson: {
        select: {
          id: true,
          name: true,
          deleted: true,
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          mailingListId: true,
          eventId: true,
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

  if (!email || !email.campaign) {
    return null;
  }

  if (!email.crmPersonId || email.crmPersonId !== personId) {
    return null;
  }

  const campaign = email.campaign;

  const memberships = await prisma.mailingListMember.findMany({
    where: {
      crmPersonId: personId,
      deleted: false,
      mailingList: {
        eventId: campaign.eventId,
        deleted: false,
      },
    },
    select: {
      id: true,
      status: true,
      mailingListId: true,
      mailingList: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return { email, campaign, person: email.crmPerson, memberships };
};

export const get = [
  async (req, res) => {
    const parsed = querySchema.safeParse(req.query || {});

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid unsubscribe link" });
    }

    try {
      const context = await fetchContext({
        emailId: parsed.data.e,
        personId: parsed.data.p,
      });

      if (!context) {
        return res
          .status(404)
          .json({ message: "Unsubscribe link is invalid or expired" });
      }

      return res.json(shapeResponse(context));
    } catch (error) {
      console.error("Failed to load unsubscribe context", error);
      return res
        .status(500)
        .json({ message: "Failed to load unsubscribe details" });
    }
  },
];

export const post = [
  async (req, res) => {
    const parsedQuery = querySchema.safeParse(req.query || {});

    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid unsubscribe link" });
    }

    const parsedBody = bodySchema.safeParse(req.body || {});

    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid unsubscribe request" });
    }

    if (
      parsedQuery.data.e !== parsedBody.data.emailId ||
      parsedQuery.data.p !== parsedBody.data.personId
    ) {
      return res.status(400).json({ message: "Unsubscribe payload mismatch" });
    }

    try {
      const context = await fetchContext({
        emailId: parsedBody.data.emailId,
        personId: parsedBody.data.personId,
      });

      if (!context) {
        return res
          .status(404)
          .json({ message: "Unsubscribe link is invalid or expired" });
      }

      const { email, campaign, memberships, person } = context;
      const personId = parsedBody.data.personId;

      if (!memberships.length) {
        return res.status(400).json({
          message: "No mailing lists found for this recipient",
        });
      }

      const membershipByListId = new Map(
        memberships.map((membership) => [membership.mailingListId, membership])
      );

      const unsubscribeAll = Boolean(parsedBody.data.unsubscribeAll);
      const requestedIds = new Set(
        unsubscribeAll
          ? memberships.map((membership) => membership.mailingListId)
          : (parsedBody.data.mailingListIds || []).filter((id) =>
              membershipByListId.has(id)
            )
      );

      if (!requestedIds.size) {
        return res.status(200).json({
          message: "No mailing lists were updated",
          ...shapeResponse(context),
        });
      }

      const updates = memberships.filter(
        (membership) =>
          requestedIds.has(membership.mailingListId) &&
          membership.status !== MailingListMemberStatus.UNSUBSCRIBED
      );

      const shouldMarkEmailUnsubscribed = requestedIds.has(
        campaign.mailingListId
      );

      await prisma.$transaction(async (tx) => {
        for (const membership of updates) {
          await tx.mailingListMember.update({
            where: { id: membership.id },
            data: { status: MailingListMemberStatus.UNSUBSCRIBED },
          });

          await tx.logs.create({
            data: {
              type: LogType.MAILING_LIST_MEMBER_MODIFIED,
              crmPersonId: personId,
              mailingListId: membership.mailingListId,
              eventId: campaign.event?.id ?? null,
              data: {
                action: "UNSUBSCRIBE",
                emailId: email.id,
              },
            },
          });
        }

        if (shouldMarkEmailUnsubscribed) {
          await tx.email.update({
            where: { id: email.id },
            data: { status: EmailStatus.UNSUBSCRIBED },
          });
        }
      });

      const refreshed = await fetchContext({
        emailId: parsedBody.data.emailId,
        personId: parsedBody.data.personId,
      });

      return res.json({
        message: updates.length
          ? "You have been unsubscribed."
          : "Your preferences are unchanged.",
        ...shapeResponse(refreshed || context),
      });
    } catch (error) {
      console.error("Failed to process unsubscribe request", error);
      return res
        .status(500)
        .json({ message: "Failed to update your preferences" });
    }
  },
];
