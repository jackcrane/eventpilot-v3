import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum(["createdAt", "status", "recipientName", "recipientEmail"])
    .optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  status: z.string().optional(),
});

const EMAIL_STATUS_VALUES = ["SENT", "DELIVERED", "OPENED", "BOUNCED"];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, campaignId } = req.params;
    const parsed = querySchema.safeParse(req.query || {});

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }

    const {
      page: rawPage,
      size,
      sortBy = "recipientName",
      sortDirection = "asc",
      q,
      status: statusParam,
    } = parsed.data;

    const normalizedSortDirection = sortDirection === "asc" ? "asc" : "desc";
    const requestedStatuses = (statusParam || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((value) => EMAIL_STATUS_VALUES.includes(value));

    try {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, eventId },
        select: { id: true },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const whereClause = {
        campaignId,
        ...(requestedStatuses.length
          ? { status: { in: requestedStatuses } }
          : {}),
        ...(q
          ? {
              OR: [
                { to: { contains: q, mode: "insensitive" } },
                { crmPerson: { name: { contains: q, mode: "insensitive" } } },
                {
                  crmPersonEmail: {
                    email: { contains: q, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      };

      const totalItems = await prisma.email.count({ where: whereClause });
      const totalPages = Math.max(1, Math.ceil(totalItems / size));
      const safePage = Math.min(Math.max(1, rawPage), totalPages);

      const orderBy = (() => {
        if (sortBy === "status") {
          return { status: normalizedSortDirection };
        }

        if (sortBy === "recipientName") {
          return [
            { crmPerson: { name: normalizedSortDirection } },
            { to: normalizedSortDirection },
          ];
        }

        if (sortBy === "recipientEmail") {
          return [
            { crmPersonEmail: { email: normalizedSortDirection } },
            { to: normalizedSortDirection },
          ];
        }

        return { createdAt: normalizedSortDirection };
      })();

      const emails = await prisma.email.findMany({
        where: whereClause,
        include: {
          crmPerson: {
            select: {
              id: true,
              name: true,
              deleted: true,
            },
          },
          crmPersonEmail: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy,
        skip: (safePage - 1) * size,
        take: size,
      });

      return res.json({
        emails: emails.map((email) => ({
          id: email.id,
          createdAt: email.createdAt,
          status: email.status,
          to: email.to,
          crmPerson: email.crmPerson
            ? {
                id: email.crmPerson.id,
                name: email.crmPerson.name,
                deleted: email.crmPerson.deleted,
              }
            : null,
          crmPersonEmail: email.crmPersonEmail
            ? {
                id: email.crmPersonEmail.id,
                email: email.crmPersonEmail.email,
              }
            : null,
        })),
        meta: {
          page: safePage,
          size,
          totalItems,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrevious: safePage > 1,
          sortBy,
          sortDirection: normalizedSortDirection,
          status: requestedStatuses,
          query: q ?? null,
        },
      });
    } catch (error) {
      console.error(
        `Failed to load campaign emails for campaign ${campaignId} on event ${eventId}:`,
        error
      );
      return res
        .status(500)
        .json({ message: "Failed to load campaign recipients" });
    }
  },
];
