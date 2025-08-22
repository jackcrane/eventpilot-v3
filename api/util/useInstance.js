import { prisma } from "#prisma";

export const useInstance =
  (required = true) =>
  async (req, res, next) => {
    const instanceId = req.instanceId;

    if (!instanceId && required) {
      return res.status(400).json({ message: "Instance is required" });
    }

    const instance = await prisma.eventInstance.findUnique({
      where: { id: instanceId, eventId: req.eventId },
    });

    if (!instance) {
      return res.status(404).json({ message: "Instance not found" });
    }

    req.instance = instance;
    req.instanceId = instanceId;

    next();
  };
