import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, personId } = req.params;

    try {
      // Ensure person exists and belongs to this event
      const person = await prisma.crmPerson.findUnique({
        where: { id: personId },
        select: { id: true, eventId: true, deleted: true },
      });
      if (!person || person.deleted || person.eventId !== eventId) {
        return res.status(404).json({ message: "Person not found" });
      }

      const ledgerItems = await prisma.ledgerItem.findMany({
        where: { crmPersonId: personId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          originalAmount: true,
          source: true,
          createdAt: true,
          registrationId: true,
          instanceId: true,
        },
      });

      const lifetimeValue = (ledgerItems || []).reduce(
        (sum, li) => sum + Number(li.amount || 0),
        0
      );

      return res.json({ ledgerItems, lifetimeValue });
    } catch (e) {
      console.error("[LEDGER][GET] Error:", e);
      reportApiError(e, req);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

