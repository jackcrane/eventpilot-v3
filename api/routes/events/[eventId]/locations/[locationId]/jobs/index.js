import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { z } from "zod";
import { reportApiError } from "#util/reportApiError.js";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  capacity: z.number().min(0),
  restrictions: z.array(
    z.enum([
      "OVER_18",
      "OVER_21",
      "SPECIAL_CERT_REQUIRED",
      "PHYSICAL_ABILITY",
      "OTHER",
    ])
  ),
  location: z.string().cuid(),
  shifts: z.array(
    z.object({
      capacity: z.number().min(0),
      startTime: z.date(),
      startTimeTz: z.string(),
      endTime: z.date(),
      endTimeTz: z.string(),
    })
  ),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId } = req.params;
    const instanceId = req.instanceId;

    try {
      req.body.shifts = req.body.shifts.map((s) => {
        s.startTime = new Date(s.startTime);
        s.endTime = new Date(s.endTime);
        return s;
      });
    } catch {
      return res.status(400).json({ message: "Invalid date" });
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log(result.error.issues);
      return res.status(400).json({ message: result.error.issues });
    }

    const { name, description, capacity, restrictions, shifts } = result.data;

    try {
      const job = await prisma.job.create({
        data: {
          name,
          description,
          capacity,
          restrictions,
          instance: { connect: { id: instanceId } },
          event: { connect: { id: eventId } },
          location: { connect: { id: locationId } },
          shifts: {
            create: shifts.map(
              ({ capacity, startTime, endTime, startTimeTz, endTimeTz }) => ({
                capacity,
                startTime: startTime,
                endTime: endTime,
                startTimeTz: startTimeTz,
                endTimeTz: endTimeTz,
                event: { connect: { id: eventId } },
                location: { connect: { id: locationId } },
                instance: { connect: { id: instanceId } },
              })
            ),
          },
        },
        include: { shifts: { orderBy: { startTime: "asc" } } },
      });

      await prisma.logs.create({
        data: {
          type: LogType.JOB_CREATED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          instanceId: req.instanceId,
          locationId: req.params.locationId,
          jobId: job.id,
          data: job,
        },
      });

      return res.status(201).json({ message: "Job created", job });
    } catch (error) {
      console.log(error);
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { locationId } = req.params;
    const instanceId = req.instanceId;

    try {
      const jobs = await prisma.job.findMany({
        where: {
          locationId,
          deleted: false,
          instanceId,
        },
        include: {
          shifts: { orderBy: { startTime: "asc" }, where: { deleted: false } },
        },
      });

      return res.json({
        jobs,
      });
    } catch (error) {
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { jobId } = req.params;
    try {
      await prisma.job.update({
        where: {
          id: jobId,
        },
        data: { deleted: true },
      });

      await prisma.logs.create({
        data: {
          type: LogType.JOB_DELETED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          locationId: req.params.locationId,
          jobId: jobId,
        },
      });

      return res.status(204).end();
    } catch (error) {
      console.log(error);
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];
