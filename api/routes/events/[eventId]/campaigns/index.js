import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { sendBroadcastEmailToCrmPersons } from "#postmark";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    try {
      const campaigns = await prisma.campaign.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ campaigns });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  },
];

const requestSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  from: z.string().min(3),
  crmPersonIds: z.array(z.string()).min(1),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // Create the campaign
    const campaign = await prisma.campaign.create({
      data: { name: parsed.data.name, eventId },
    });

    // Load recipients for the event, include emails to pre-check availability
    const people = await prisma.crmPerson.findMany({
      where: { id: { in: parsed.data.crmPersonIds }, eventId, deleted: false },
      include: { emails: true },
    });

    if (!people.length) {
      return res.status(404).json({ message: "No recipients found for event" });
    }

    // Determine which have deliverable email addresses (for UX only)
    const deliverable = [];
    const skipped = [];
    for (const p of people) {
      let email = null;
      if (Array.isArray(p.emails) && p.emails.length) {
        const active = p.emails.find((e) => e && e.email && !e.deleted);
        const any = p.emails.find((e) => e && e.email);
        email = (active || any)?.email || null;
      }
      if (!email && typeof p.email === "string") email = p.email;
      if (email) deliverable.push(p.id);
      else skipped.push({ id: p.id, reason: "No email found" });
    }

    // Enqueue all intended recipients; background will handle final validation
    const toEnqueueIds = people.map((p) => p.id);
    const data = toEnqueueIds.map((pid) => ({
      campaignId: campaign.id,
      crmPersonId: pid,
      from: parsed.data.from,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "PENDING",
      userId: req.user?.id || null,
    }));

    await prisma.campaignEmailQueue.createMany({ data });

    return res.json({
      campaign,
      enqueued: data.length,
      skipped,
    });
  },
];

export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const { campaignId, limit } = req.body || {};
    const take = Math.max(1, Math.min(Number(limit) || 100, 500));

    try {
      // Load a batch of PENDING items scoped to this event (and optionally a campaign)
      const pending = await prisma.campaignEmailQueue.findMany({
        where: {
          status: "PENDING",
          ...(campaignId ? { campaignId } : {}),
          crmPerson: { eventId },
          campaign: { eventId },
        },
        orderBy: { createdAt: "asc" },
        take,
        include: { crmPerson: { include: { emails: true } } },
      });

      if (pending.length) {
        const ids = pending.map((q) => q.id);
        await prisma.campaignEmailQueue.updateMany({
          where: { id: { in: ids }, status: "PENDING" },
          data: { status: "PROCESSING" },
        });

        // Group by campaign + message signature to leverage Postmark batch
        const groups = new Map();
        for (const q of pending) {
          const key = `${q.campaignId}|${q.from}|${q.subject}|${q.body}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(q);
        }

        for (const [, items] of groups) {
          const grpCampaignId = items[0].campaignId;
          const from = items[0].from;
          const subject = items[0].subject;
          const body = items[0].body;
          const userId = items[0].userId || undefined;

          const crmPersons = items.map((i) => i.crmPerson);

          try {
            await sendBroadcastEmailToCrmPersons({
              crmPersons,
              from,
              subject,
              body,
              userId,
              campaignId: grpCampaignId,
            });

            const itemIds = items.map((i) => i.id);
            await prisma.campaignEmailQueue.updateMany({
              where: { id: { in: itemIds } },
              data: { status: "SENT" },
            });
          } catch (err) {
            console.error("[CAMPAIGN_QUEUE] batch error", err);
            const itemIds = items.map((i) => i.id);
            await prisma.campaignEmailQueue.updateMany({
              where: { id: { in: itemIds } },
              data: { status: "PENDING" },
            });
          }
        }
      }

      // Return progress counts for UX
      const [pendingCount, processingCount, sentCount] = await Promise.all([
        prisma.campaignEmailQueue.count({
          where: { status: "PENDING", ...(campaignId ? { campaignId } : {}), crmPerson: { eventId } },
        }),
        prisma.campaignEmailQueue.count({
          where: { status: "PROCESSING", ...(campaignId ? { campaignId } : {}), crmPerson: { eventId } },
        }),
        prisma.campaignEmailQueue.count({
          where: { status: "SENT", ...(campaignId ? { campaignId } : {}), crmPerson: { eventId } },
        }),
      ]);

      return res.json({
        processedThisCall: pending.length,
        pending: pendingCount,
        processing: processingCount,
        sent: sentCount,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  },
];
