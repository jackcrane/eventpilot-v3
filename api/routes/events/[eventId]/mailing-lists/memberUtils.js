import { prisma } from "#prisma";

export const memberInclude = {
  include: {
    crmPerson: {
      select: {
        id: true,
        name: true,
        deleted: true,
        emails: {
          where: { deleted: false },
          select: { id: true, email: true, label: true },
        },
      },
    },
  },
};

export const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

export const ensureMailingList = (eventId, mailingListId) =>
  prisma.mailingList.findFirst({
    where: { id: mailingListId, eventId, deleted: false },
  });

export const ensureCrmPerson = (eventId, crmPersonId) =>
  prisma.crmPerson.findFirst({
    where: { id: crmPersonId, eventId, deleted: false },
  });

export const findMember = (mailingListId, crmPersonId) =>
  prisma.mailingListMember.findUnique({
    where: {
      mailingListId_crmPersonId: { mailingListId, crmPersonId },
    },
    ...memberInclude,
  });

export const memberSummarySelect = {
  id: true,
  crmPersonId: true,
  deleted: true,
  status: true,
};
