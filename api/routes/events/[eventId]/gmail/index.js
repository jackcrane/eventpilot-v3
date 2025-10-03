import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const conn = await prisma.gmailConnection.findUnique({
        where: { eventId },
        select: {
          id: true,
          email: true,
          googleUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return res.status(200).json({ gmailConnection: conn });
    } catch (e) {
      console.error(e);
      reportApiError(e, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      await prisma.gmailConnection
        .delete({ where: { eventId } })
        .catch(() => null);
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      reportApiError(e, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
