import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";
import {
  derivePinLookupKey,
  generateDashboardPin,
  hashPin,
} from "#util/dayOfDashboard.js";
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

        let pin;
        let pinLookupKey;
        let pinHash;

        for (let attempts = 0; attempts < 10; attempts += 1) {
          pin = generateDashboardPin();
          pinLookupKey = derivePinLookupKey(pin);

          const conflict = await tx.dayOfDashboardProvisioner.findUnique({
            where: { pinLookupKey },
            select: { id: true },
          });

          if (!conflict) {
            pinHash = await hashPin(pin);
            break;
          }
        }

        if (!pinHash) {
          throw new Error("Unable to generate a unique access pin");
        }

        const provisioner = await tx.dayOfDashboardProvisioner.update({
          where: { id: provisionerId },
          data: {
            pin,
            pinLookupKey,
            pinHash,
            lastPinGeneratedAt: new Date(),
            tokenVersion: { increment: 1 },
          },
          select: provisionerSelect,
        });

        return { provisioner, pin };
      });

      if (!result) {
        return res.status(404).json({ message: "Provisioner not found" });
      }

      return res.json({
        provisioner: formatProvisioner(result.provisioner),
        pin: result.pin,
      });
    } catch (error) {
      console.error("Failed to end day-of dashboard provisioner sessions", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to end sessions" });
    }
  },
];
