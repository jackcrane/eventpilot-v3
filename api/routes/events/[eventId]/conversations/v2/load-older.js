import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { ingestGmailWindowForEvent } from "../../../../webhooks/fragments/ingestGmailWindow.js";

const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

const toYmd = (d) => {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    try {
      // Find oldest email we have saved for this event (inbound or outbound)
      const oldestInbound = await prisma.inboundEmail.findFirst({
        where: { eventId },
        orderBy: { receivedAt: "asc" },
        select: { receivedAt: true },
      });
      const oldestOutbound = await prisma.email.findFirst({
        where: { conversation: { eventId } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      let oldestDate = null;
      if (oldestInbound?.receivedAt)
        oldestDate = new Date(oldestInbound.receivedAt);
      if (oldestOutbound?.createdAt) {
        const od = new Date(oldestOutbound.createdAt);
        if (!oldestDate || od < oldestDate) oldestDate = od;
      }
      if (!oldestDate) oldestDate = new Date();

      const before = new Date(oldestDate.getTime());
      const after = new Date(Math.max(0, before.getTime() - oneWeekMs));

      // Gmail date queries are day-based; use UTC date parts
      const q = `after:${toYmd(after)} before:${toYmd(before)} -in:chats`;

      const { processed } = await ingestGmailWindowForEvent({
        eventId,
        q,
        reqId: req.id,
      });

      return res
        .status(200)
        .json({
          success: true,
          processed,
          range: { after: after.toISOString(), before: before.toISOString() },
        });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      const msg = String(e?.message || "");
      if (
        msg.includes("invalid_grant") ||
        msg.includes("invalid_credentials")
      ) {
        return res
          .status(400)
          .json({ message: "Gmail connection expired; please reconnect" });
      }
      console.error("[conversations v2 load-older]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
