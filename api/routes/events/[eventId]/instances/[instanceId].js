import { prisma } from "#prisma";
import { getNextInstance } from "#util/getNextInstance";
import { verifyAuth } from "#verifyAuth";
import { instanceSchema } from "./index";
import { zerialize } from "zodex";
import { reportApiError } from "#util/reportApiError.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, instanceId } = req.params;

    try {
      const instance = await prisma.eventInstance.findUnique({
        where: { id: instanceId, eventId },
      });

      if (!instance) {
        return res.status(404).json({ message: "Instance not found" });
      }

      const nextInstance = await getNextInstance(eventId);

      res.json({
        instance: {
          ...instance,
          isNext: nextInstance ? instance.id === nextInstance.id : false,
          active:
            instance.startTime.getTime() < new Date().getTime() &&
            instance.endTime.getTime() > new Date().getTime(),
        },
      });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, instanceId } = req.params;
    const parsed = instanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error });
    }

    try {
      const instance = await prisma.eventInstance.update({
        where: { id: instanceId, eventId },
        data: parsed.data,
      });

      res.json({ instance });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, instanceId } = req.params;

    try {
      await prisma.eventInstance.update({
        where: { id: instanceId, eventId },
        data: { deleted: true },
      });

      res.json({ message: "Instance deleted successfully" });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(instanceSchema));
  },
];
