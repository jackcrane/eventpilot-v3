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
        const inboundEmail = await prisma.inboundEmail.findUnique({
          where: {
            id: emailId,
          },
          include: {
            from: true,
            to: true,
            cc: true,
            bcc: true,
            attachments: {
              include: {
                file: true,
              },
            },
            crmPersons: true,
            headers: true,
          },
        });

        if (inboundEmail) {
          return res.status(200).json({
            email: { type: "INBOUND", ...inboundEmail },
          });
        }

        return res.status(404).json({ message: "Email not found" });
      }

      res.json({
        email: { type: "OUTBOUND", ...email },
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/email/:emailId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
