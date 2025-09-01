import { verifyAuth } from "#verifyAuth";
import { getGmailClientForEvent, getHeader } from "#util/google";

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
    const { q, pageToken, labelIds } = req.query;
    const maxResultsRaw = Number(req.query?.maxResults || 20);
    const maxResults = Math.max(
      1,
      Math.min(100, isNaN(maxResultsRaw) ? 20 : maxResultsRaw)
    );

    try {
      const { gmail } = await getGmailClientForEvent(eventId);

      const list = await gmail.users.threads.list({
        userId: "me",
        q: q || undefined,
        pageToken: pageToken || undefined,
        maxResults,
        labelIds: labelIds
          ? String(labelIds)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      });

      const threads = list.data.threads || [];
      if (threads.length === 0) {
        return res.status(200).json({
          threads: [],
          nextPageToken: list.data.nextPageToken || null,
          resultSizeEstimate: list.data.resultSizeEstimate || 0,
        });
      }

      // Fetch thread details in parallel with minimal metadata
      const details = await Promise.all(
        threads.map((t) =>
          gmail.users.threads.get({
            userId: "me",
            id: t.id,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "To", "Cc", "Date"],
          })
        )
      );

      const summaries = details.map((resp) => {
        const data = resp.data || {};
        const messages = data.messages || [];
        const messagesCount = messages.length;
        // Sort by internalDate (string of millis)
        const sorted = [...messages].sort(
          (a, b) => Number(a.internalDate || 0) - Number(b.internalDate || 0)
        );
        const last = sorted[sorted.length - 1];
        const first = sorted[0];

        const lastPayload = last?.payload;
        const subject = getHeader(lastPayload, "Subject");
        const from = getHeader(lastPayload, "From");
        const to = getHeader(lastPayload, "To");
        const cc = getHeader(lastPayload, "Cc");
        const date = getHeader(lastPayload, "Date");
        const lastInternalDate = last?.internalDate
          ? new Date(Number(last.internalDate))
          : null;

        const isUnread = messages.some((m) =>
          (m.labelIds || []).includes("UNREAD")
        );

        return {
          id: data.id,
          historyId: data.historyId,
          snippet: data.snippet || last?.snippet || null,
          messagesCount,
          lastMessage: {
            id: last?.id,
            subject,
            from,
            to,
            cc,
            date,
            internalDate: lastInternalDate,
            labelIds: last?.labelIds || [],
          },
          firstMessageId: first?.id || null,
          isUnread,
        };
      });

      return res.status(200).json({
        threads: summaries,
        nextPageToken: list.data.nextPageToken || null,
        resultSizeEstimate: list.data.resultSizeEstimate || summaries.length,
      });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      // If Google rejects due to invalid_grant/expired token without refresh
      const msg = String(e?.message || "");
      if (
        msg.includes("invalid_grant") ||
        msg.includes("invalid_credentials")
      ) {
        return res
          .status(400)
          .json({ message: "Gmail connection expired; please reconnect" });
      }
      console.error("[conversations v2 threads]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
