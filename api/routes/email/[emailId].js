import { prisma } from "#prisma";

export const get = [
  async (req, res) => {
    const emailId = req.params.emailId;

    try {
      const email = await prisma.email.findUnique({
        where: {
          id: emailId,
        },
        include: {
          crmPerson: true,
        },
      });

      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      res.json({
        email,
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/email/:emailId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
