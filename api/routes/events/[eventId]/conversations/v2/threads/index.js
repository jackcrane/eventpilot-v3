import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

// GET /api/events/:eventId/conversations/v2/threads
// Query params:
// - q: optional Gmail search query
// - pageToken: optional pagination token
// - maxResults: default 20 (max 100)
// - labelIds: comma-separated label ids
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const { q } = req.query;
    const maxResultsRaw = Number(req.query?.maxResults || 20);
    const maxResults = Math.max(
      1,
      Math.min(100, isNaN(maxResultsRaw) ? 20 : maxResultsRaw)
    );

    try {
      // Pull conversations and derive summaries from DB only
      const convs = await prisma.conversation.findMany({
        where: { eventId },
        include: {
          inboundEmails: {
            orderBy: { receivedAt: "desc" },
            take: 1,
            include: { from: true, attachments: { include: { file: true } } },
          },
          outboundEmails: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { inboundEmails: true, outboundEmails: true } },
        },
      });

      // Precompute unread flags in batch
      const ids = convs.map((c) => c.id);
      const unread = await prisma.inboundEmail.groupBy({
        by: ["conversationId"],
        where: { conversationId: { in: ids }, read: false },
        _count: { _all: true },
      });
      const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count._all]));

      const stripHtml = (html) =>
        String(html || "")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const summaries = convs
        .map((c) => {
          const lastIn = c.inboundEmails[0] || null;
          const lastOut = c.outboundEmails[0] || null;
          const dIn = lastIn?.receivedAt ? new Date(lastIn.receivedAt) : null;
          const dOut = lastOut?.createdAt ? new Date(lastOut.createdAt) : null;
          const isInNewer = dIn && (!dOut || dIn > dOut);
          const last = isInNewer ? lastIn : lastOut;
          const lastDate = isInNewer ? dIn : dOut;
          const subject = (lastIn?.subject || lastOut?.subject || "").trim();
          const fromStr = isInNewer
            ? (lastIn?.from
                ? `${lastIn.from.name ? lastIn.from.name + " " : ""}<${lastIn.from.email}>`
                : "")
            : lastOut?.from || "";
          const text = isInNewer
            ? (lastIn?.textBody || stripHtml(lastIn?.htmlBody))
            : (lastOut?.textBody || stripHtml(lastOut?.htmlBody));
          const snippet = String(text || "").slice(0, 200);
          const hasAttachments = Boolean(
            (lastIn?.attachments || []).length > 0
          );
          return {
            id: c.id,
            historyId: null,
            snippet: snippet || null,
            messagesCount: c._count.inboundEmails + c._count.outboundEmails,
            lastMessage: {
              id: (lastIn?.id || lastOut?.id) ?? null,
              subject,
              from: fromStr,
              to: isInNewer ? "" : lastOut?.to || "",
              cc: "",
              date: null,
              internalDate: lastDate,
              labelIds: [],
            },
            firstMessageId: null,
            isUnread: (unreadMap.get(c.id) || 0) > 0,
            hasAttachments,
          };
        })
        .sort((a, b) => {
          const ad = a.lastMessage.internalDate
            ? new Date(a.lastMessage.internalDate).getTime()
            : 0;
          const bd = b.lastMessage.internalDate
            ? new Date(b.lastMessage.internalDate).getTime()
            : 0;
          return bd - ad;
        });

      const filtered = q
        ? summaries.filter((s) => {
            const Q = String(q).toLowerCase();
            return (
              String(s.lastMessage.subject || "").toLowerCase().includes(Q) ||
              String(s.lastMessage.from || "").toLowerCase().includes(Q) ||
              String(s.snippet || "").toLowerCase().includes(Q)
            );
          })
        : summaries;

      const limited = filtered.slice(0, maxResults);

      return res.status(200).json({
        threads: limited,
        nextPageToken: null,
        resultSizeEstimate: filtered.length,
      });
    } catch (e) {
      console.error("[conversations v2 threads]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
