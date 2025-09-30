import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { formatProvisioner, provisionerSelect } from "../shared.js";

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, provisionerId } = req.params;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.dayOfDashboardProvisioner.findFirst({
          where: { id: provisionerId, eventId },
          select: { id: true },
        });

        if (!existing) {
          return null;
        }

        await tx.dayOfDashboardAccount.updateMany({
          where: { provisionerId, deleted: false },
          data: {
            deleted: true,
            tokenVersion: { increment: 1 },
          },
        });

        const provisioner = await tx.dayOfDashboardProvisioner.update({
          where: { id: provisionerId },
          data: {
            tokenVersion: { increment: 1 },
          },
          select: provisionerSelect,
        });

        return provisioner;
      });

      if (!result) {
        return res.status(404).json({ message: "Provisioner not found" });
      }

      return res.json({ provisioner: formatProvisioner(result) });
    } catch (error) {
      console.error("Failed to end day-of dashboard provisioner sessions", error);
      return res.status(500).json({ message: "Failed to end sessions" });
    }
  },
];
