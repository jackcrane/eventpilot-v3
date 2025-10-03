import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { getChangedKeys } from "#getChangedKeys";
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
  shifts: z.array(
    z.object({
      capacity: z.number().min(0),
      startTime: z.string(),
      endTime: z.string(),
      startTimeTz: z.string(),
      endTimeTz: z.string(),
      id: z.string().nullable().optional(),
    })
  ),
});

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { locationId, jobId } = req.params;
    try {
      const job = await prisma.job.findUnique({
        where: {
          id: jobId,
        },
        include: {
          shifts: { orderBy: { startTime: "asc" }, where: { deleted: false } },
        },
      });

      if (!job || job.locationId !== locationId) {
        return res.status(404).json({ message: "Job not found" });
      }

      return res.json({
        job,
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
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId, jobId } = req.params;
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }
    const {
      name,
      description,
      capacity,
      restrictions,
      shifts = [],
    } = result.data;

    // pull out any submitted shift IDs
    const submittedIds = shifts.filter((s) => s.id).map((s) => s.id);
    const newShifts = shifts.filter((s) => !s.id);

    const before = await prisma.job.findUnique({
      where: { id: jobId, deleted: false },
      include: {
        shifts: true,
      },
    });

    const deletedShifts = before.shifts.filter(
      (s) => !submittedIds.includes(s.id)
    );

    try {
      const job = await prisma.job.update({
        where: { id: jobId },
        data: {
          name,
          description,
          capacity,
          restrictions,
          eventId,
          locationId,
          shifts: {
            // delete any shift not re-submitted
            updateMany: {
              where: {
                id: { notIn: submittedIds },
              },
              data: {
                deleted: true,
              },
            },
            // update existing ones
            update: submittedIds.map((id) => {
              const s = shifts.find((sh) => sh.id === id);
              return {
                where: { id },
                data: {
                  capacity: s.capacity,
                  startTime: new Date(s.startTime),
                  endTime: new Date(s.endTime),
                  startTimeTz: s.startTimeTz,
                  endTimeTz: s.endTimeTz,
                },
              };
            }),
            // create brand-new ones
            create: newShifts.map((s) => ({
              capacity: s.capacity,
              startTime: new Date(s.startTime),
              endTime: new Date(s.endTime),
              eventId,
              startTimeTz: s.startTimeTz,
              endTimeTz: s.endTimeTz,
              locationId,
            })),
          },
          logs: {
            createMany: {
              data: deletedShifts.map((s) => ({
                type: LogType.SHIFT_DELETED,
                userId: req.user.id,
                ip: req.ip,
                eventId: req.params.eventId,
                locationId: req.params.locationId,
                shiftId: s.id,
                data: s,
              })),
            },
          },
        },
        include: { shifts: true },
      });

      const changedKeys = getChangedKeys(before, job);
      await prisma.logs.create({
        data: {
          type: LogType.JOB_MODIFIED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          locationId: req.params.locationId,
          jobId: jobId,
          data: changedKeys,
        },
      });

      return res.json({ job });
    } catch (error) {
      console.log(error);
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];
