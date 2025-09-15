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
      // Tokenize query for AND matching and highlighting
      const tokens = String(q || "")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      // Build DB-side search across all messages, recipients, and attachment names
      const buildWhere = () => {
        if (!q) return { eventId };
        const clauseFor = (token) => {
          const insensitive = { contains: token, mode: "insensitive" };
          return {
            OR: [
              // Inbound email fields and relations
              {
                inboundEmails: {
                  some: {
                    OR: [
                      { subject: insensitive },
                      { textBody: insensitive },
                      { htmlBody: insensitive },
                      { from: { is: { email: insensitive } } },
                      { from: { is: { name: insensitive } } },
                      { to: { some: { email: insensitive } } },
                      { to: { some: { name: insensitive } } },
                      { cc: { some: { email: insensitive } } },
                      { cc: { some: { name: insensitive } } },
                      { bcc: { some: { email: insensitive } } },
                      { bcc: { some: { name: insensitive } } },
                      {
                        attachments: {
                          some: { file: { is: { originalname: insensitive } } },
                        },
                      },
                    ],
                  },
                },
              },
              // Outbound email fields and relations
              {
                outboundEmails: {
                  some: {
                    OR: [
                      { subject: insensitive },
                      { textBody: insensitive },
                      { htmlBody: insensitive },
                      { from: insensitive },
                      { to: insensitive },
                      {
                        attachments: {
                          some: { file: { is: { originalname: insensitive } } },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          };
        };
        return {
          eventId,
          AND: tokens.length ? tokens.map((t) => clauseFor(t)) : [clauseFor(String(q))],
        };
      };

      const where = buildWhere();

      // Count matching conversations for resultSizeEstimate
      const [totalCount, convs] = await Promise.all([
        prisma.conversation.count({ where }),
        prisma.conversation.findMany({
          where,
          include: {
            inboundEmails: {
              orderBy: { receivedAt: "desc" },
              take: 1,
              include: {
                from: true,
                to: true,
                cc: true,
                bcc: true,
                attachments: { include: { file: true } },
              },
            },
            outboundEmails: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { attachments: { include: { file: true } } },
            },
            _count: { select: { inboundEmails: true, outboundEmails: true } },
          },
        }),
      ]);

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

      // Helper: scoring
      const scoreFor = (text = "", weightsPerToken = 1) => {
        if (!tokens.length) return 0;
        const lc = String(text || "").toLowerCase();
        let s = 0;
        for (const t of tokens) {
          if (!t) continue;
          if (lc.includes(t.toLowerCase())) s += weightsPerToken;
        }
        return s;
      };

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
            (lastIn?.attachments || []).length > 0 ||
              (lastOut?.attachments || []).length > 0
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
            // base relevance score; attachments and other signals added later
            _relevance: tokens.length
              ? scoreFor(subject, 5) + scoreFor(fromStr, 3) + scoreFor(snippet, 2)
              : 0,
          };
        })
        .sort((a, b) => {
          // preliminary recency ordering; final sort after attachments scoring
          const ad = a.lastMessage.internalDate
            ? new Date(a.lastMessage.internalDate).getTime()
            : 0;
          const bd = b.lastMessage.internalDate
            ? new Date(b.lastMessage.internalDate).getTime()
            : 0;
          return bd - ad;
        });

      // If searching, augment results with matched attachment names and boost relevance
      let augmented = summaries;
      if (tokens.length && summaries.length) {
        const ids = summaries.map((s) => s.id);
        // Fetch inbound attachment matches across the conversations
        const [inMatches, outMatches] = await Promise.all([
          prisma.inboundEmailAttachment.findMany({
            where: {
              inboundEmail: { conversationId: { in: ids } },
              OR: tokens.map((t) => ({
                file: { is: { originalname: { contains: t, mode: "insensitive" } } },
              })),
            },
            include: {
              file: { select: { originalname: true } },
              inboundEmail: { select: { conversationId: true } },
            },
          }),
          prisma.outboundEmailAttachment.findMany({
            where: {
              email: { conversationId: { in: ids } },
              OR: tokens.map((t) => ({
                file: { is: { originalname: { contains: t, mode: "insensitive" } } },
              })),
            },
            include: {
              file: { select: { originalname: true } },
              email: { select: { conversationId: true } },
            },
          }),
        ]);

        const attachmentMap = new Map(); // convId -> Set(names)
        for (const m of inMatches) {
          const cid = m?.inboundEmail?.conversationId;
          const name = m?.file?.originalname;
          if (!cid || !name) continue;
          if (!attachmentMap.has(cid)) attachmentMap.set(cid, new Set());
          attachmentMap.get(cid).add(name);
        }
        for (const m of outMatches) {
          const cid = m?.email?.conversationId;
          const name = m?.file?.originalname;
          if (!cid || !name) continue;
          if (!attachmentMap.has(cid)) attachmentMap.set(cid, new Set());
          attachmentMap.get(cid).add(name);
        }

        augmented = summaries.map((s) => {
          const names = Array.from(attachmentMap.get(s.id) || []);
          const attachScore = names.length ? 2 : 0; // base boost if any match
          // extra boost per token present in any of the names
          let perToken = 0;
          for (const t of tokens) {
            const tl = t.toLowerCase();
            if (names.some((n) => String(n).toLowerCase().includes(tl))) perToken += 2;
          }
          return {
            ...s,
            matchedAttachments: names.slice(0, 5), // cap for payload size
            _relevance: s._relevance + attachScore + perToken,
          };
        });
      }

      // Database already filtered by q; order by relevance then recency when searching
      const filtered = augmented.sort((a, b) => {
        if (tokens.length) {
          const diff = (b._relevance || 0) - (a._relevance || 0);
          if (diff !== 0) return diff;
        }
        const ad = a.lastMessage.internalDate
          ? new Date(a.lastMessage.internalDate).getTime()
          : 0;
        const bd = b.lastMessage.internalDate
          ? new Date(b.lastMessage.internalDate).getTime()
          : 0;
        return bd - ad;
      });

      const limited = filtered.slice(0, maxResults);

      // Remove server-only helper before returning
      return res.status(200).json({
        threads: limited.map(({ _relevance, ...t }) => t),
        nextPageToken: null,
        resultSizeEstimate: totalCount,
      });
    } catch (e) {
      console.error("[conversations v2 threads]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
