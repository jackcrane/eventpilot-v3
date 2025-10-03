import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { reportApiError } from "#util/reportApiError.js";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getGmailClientForEvent, sendNewEmail } from "#util/google";
import { sendEmailEvent } from "#sse";
import { upsertConversationCrmPerson } from "#util/upsertConversationCrmPerson";

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
          AND: tokens.length
            ? tokens.map((t) => clauseFor(t))
            : [clauseFor(String(q))],
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
      const unreadMap = new Map(
        unread.map((u) => [u.conversationId, u._count._all])
      );

      // Precompute attachments count per conversation (inbound + outbound)
      // Note: limited to current page of conversations; acceptable for UI list
      const [inboundCounts, outboundCounts] = await Promise.all([
        prisma.inboundEmail.findMany({
          where: { conversationId: { in: ids } },
          select: {
            conversationId: true,
            _count: { select: { attachments: true } },
          },
        }),
        prisma.email.findMany({
          where: { conversationId: { in: ids } },
          select: {
            conversationId: true,
            _count: { select: { attachments: true } },
          },
        }),
      ]);
      const attachCountMap = new Map();
      for (const row of inboundCounts) {
        const prev = attachCountMap.get(row.conversationId) || 0;
        attachCountMap.set(
          row.conversationId,
          prev + (row._count?.attachments || 0)
        );
      }
      for (const row of outboundCounts) {
        const prev = attachCountMap.get(row.conversationId) || 0;
        attachCountMap.set(
          row.conversationId,
          prev + (row._count?.attachments || 0)
        );
      }

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
          // const last = isInNewer ? lastIn : lastOut;
          const lastDate = isInNewer ? dIn : dOut;
          const subject = (lastIn?.subject || lastOut?.subject || "").trim();
          const fromStr = isInNewer
            ? lastIn?.from
              ? `${lastIn.from.name ? lastIn.from.name + " " : ""}<${lastIn.from.email}>`
              : ""
            : lastOut?.from || "";
          const text = isInNewer
            ? lastIn?.textBody || stripHtml(lastIn?.htmlBody)
            : lastOut?.textBody || stripHtml(lastOut?.htmlBody);
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
            attachmentsCount: attachCountMap.get(c.id) || 0,
            // base relevance score; attachments and other signals added later
            _relevance: tokens.length
              ? scoreFor(subject, 5) +
                scoreFor(fromStr, 3) +
                scoreFor(snippet, 2)
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
                file: {
                  is: { originalname: { contains: t, mode: "insensitive" } },
                },
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
                file: {
                  is: { originalname: { contains: t, mode: "insensitive" } },
                },
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
            if (names.some((n) => String(n).toLowerCase().includes(tl)))
              perToken += 2;
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
        threads: limited.map((t) => {
          const out = { ...t };
          delete out._relevance;
          return out;
        }),
        nextPageToken: null,
        resultSizeEstimate: totalCount,
      });
    } catch (e) {
      console.error("[conversations v2 threads]", e);
      reportApiError(e, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

// POST /api/events/:eventId/conversations/v2/threads
// Send a brand-new outbound email to start a conversation
const composeSchema = z
  .object({
    to: z.union([z.string(), z.array(z.string())]),
    cc: z.union([z.string(), z.array(z.string())]).optional(),
    bcc: z.union([z.string(), z.array(z.string())]).optional(),
    subject: z.string().optional(),
    text: z.string().optional(),
    html: z.string().optional(),
    fileIds: z.array(z.string()).optional(),
  })
  .refine((v) => Boolean(v.text || v.html), {
    message: "Either text or html body is required",
    path: ["text"],
  });

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    try {
      const parsed = composeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const { gmail, connection } = await getGmailClientForEvent(eventId);

      // Classify fileIds into attachments vs link-only based on size (encoded <= 18MB)
      const MAX_ATTACH_BYTES = Number(18 * 1024 * 1024);
      const fileIds = Array.isArray(parsed.data.fileIds)
        ? parsed.data.fileIds.filter(Boolean)
        : [];
      let attachableFiles = [];
      let linkFiles = [];
      if (fileIds.length) {
        try {
          const files = await prisma.file.findMany({
            where: { id: { in: fileIds } },
          });
          const s3ForHead = new S3Client({
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
          });
          const encodedSize = (n) => Math.ceil(Number(n || 0) / 3) * 4;
          const resolveSize = async (f) => {
            const n = Number(f?.size ?? 0);
            if (Number.isFinite(n) && n > 0) return n;
            try {
              const head = await s3ForHead.send(
                new HeadObjectCommand({
                  Bucket: process.env.AWS_BUCKET,
                  Key: f.key,
                })
              );
              const len = Number(head?.ContentLength ?? 0);
              return Number.isFinite(len) ? len : 0;
            } catch (e) {
              console.error(
                "[gmail compose attachments size head error]",
                { fileId: f.id, key: f.key },
                e
              );
              return 0;
            }
          };
          const withSizes = await Promise.all(
            files.map(async (f) => ({
              ...f,
              sizeResolved: await resolveSize(f),
            }))
          );
          for (const f of withSizes) {
            const size = f.sizeResolved ?? f.size ?? 0;
            if (
              !Number.isFinite(size) ||
              size <= 0 ||
              encodedSize(size) > MAX_ATTACH_BYTES
            ) {
              linkFiles.push(f);
            } else {
              attachableFiles.push(f);
            }
          }
        } catch (e) {
          console.error("[gmail compose attachments classify error]", e);
        }
      }

      // Fetch S3 content only for the attachable set
      let attachments = [];
      if (attachableFiles.length) {
        try {
          const s3 = new S3Client({
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
          });
          const toBuffer = async (body) => {
            if (!body) return Buffer.from("");
            if (typeof body.transformToByteArray === "function") {
              const arr = await body.transformToByteArray();
              return Buffer.from(arr);
            }
            return new Promise((resolve, reject) => {
              const chunks = [];
              body.on("data", (c) => chunks.push(Buffer.from(c)));
              body.on("error", reject);
              body.on("end", () => resolve(Buffer.concat(chunks)));
            });
          };
          attachments = await Promise.all(
            attachableFiles.map(async (f) => {
              try {
                const resp = await s3.send(
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET,
                    Key: f.key,
                  })
                );
                const buf = await toBuffer(resp.Body);
                return {
                  filename: f.originalname || "attachment",
                  contentType:
                    f.contentType || f.mimetype || "application/octet-stream",
                  data: buf,
                };
              } catch (e) {
                console.error("[gmail compose attachment fetch]", e);
                return null;
              }
            })
          );
          attachments = attachments.filter(Boolean);
        } catch (e) {
          console.error("[gmail compose attachments fetch error]", e);
        }
      }

      // If there are link-only files, append download links to body
      const linkItems = linkFiles.map((f) => ({
        name: f.originalname || "attachment",
        url: f.location,
      }));
      const appendLinkText = linkItems.length
        ? `\n\nAttachments available as downloads:\n` +
          linkItems.map((i) => `- ${i.name}: ${i.url}`).join("\n")
        : "";
      const appendLinkHtml = linkItems.length
        ? `\n\n<hr/><p><strong>Attachments available as downloads:</strong></p><ul>` +
          linkItems
            .map((i) => `<li><a href="${i.url}">${i.name}</a></li>`)
            .join("") +
          `</ul>`
        : "";
      const bodyText = (parsed.data.text || "") + appendLinkText;
      const bodyHtml = parsed.data.html
        ? parsed.data.html + appendLinkHtml
        : undefined;

      let result;
      try {
        result = await sendNewEmail(gmail, connection.email, {
          to: parsed.data.to,
          cc: parsed.data.cc,
          bcc: parsed.data.bcc,
          subject: parsed.data.subject,
          text: bodyText,
          html: bodyHtml,
          attachments,
        });
      } catch (e) {
        const msg = String(e?.message || "");
        if (
          msg.includes("invalid_grant") ||
          msg.includes("invalid_credentials")
        ) {
          return res
            .status(400)
            .json({ message: "Gmail connection expired; please reconnect" });
        }
        console.error("[conversations v2 compose post]", e);
        throw e;
      }

      // Persist conversation and outbound email immediately for UI consistency
      const threadId = result.threadId || null;
      let conversationId = threadId;
      try {
        if (threadId) {
          await prisma.conversation.upsert({
            where: { id: threadId },
            update: {},
            create: { id: threadId, event: { connect: { id: eventId } } },
          });
        } else {
          const conv = await prisma.conversation.create({
            data: { event: { connect: { id: eventId } } },
          });
          conversationId = conv.id;
        }
      } catch (e) {
        console.error("[gmail compose persist conversation]", e);
      }

      let emailRecord = null;
      try {
        const persistedMessageId =
          result.messageId || result.sentId || `${Date.now()}`;
        emailRecord = await prisma.email.create({
          data: {
            conversationId: conversationId,
            messageId: persistedMessageId,
            from: connection.email,
            to: Array.isArray(parsed.data.to)
              ? parsed.data.to.join(", ")
              : parsed.data.to || "",
            subject: parsed.data.subject || "",
            htmlBody: bodyHtml || null,
            textBody: bodyText || null,
            logs: {
              create: {
                type: "EMAIL_SENT",
                eventId,
                data: { source: "immediate", confirmed: false },
              },
            },
          },
        });
        // Persist attachments/link records
        try {
          const outData = [];
          for (const f of attachableFiles) {
            outData.push({
              emailId: emailRecord.id,
              fileId: f.id,
              deliveryMode: "ATTACHMENT",
            });
          }
          for (const f of linkFiles) {
            outData.push({
              emailId: emailRecord.id,
              fileId: f.id,
              deliveryMode: "LINK",
            });
          }
          if (outData.length)
            await prisma.outboundEmailAttachment.createMany({ data: outData });
        } catch (e) {
          console.error("[gmail compose persist outbound attachments]", e);
        }

        // Ensure conversation participants from recipients
        try {
          const recipients = Array.isArray(parsed.data.to)
            ? parsed.data.to
            : [parsed.data.to];
          for (const r of recipients) {
            const emails = String(r)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            for (const e of emails) {
              try {
                await upsertConversationCrmPerson(e, conversationId, eventId);
              } catch (err) {
                console.error(err);
              }
            }
          }
        } catch (err) {
          console.error(err);
        }

        try {
          sendEmailEvent(eventId, emailRecord);
        } catch (err) {
          console.error(err);
        }
      } catch (e) {
        console.error("[gmail compose immediate persist]", e);
      }

      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        id: result.sentId,
        threadId: conversationId,
      });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      if (e?.code === "NO_RECIPIENTS") {
        return res.status(400).json({ message: "No recipients provided" });
      }
      console.error("[conversations v2 threads compose]", e);
      reportApiError(e, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
