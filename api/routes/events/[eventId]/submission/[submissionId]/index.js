import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { getChangedKeys } from "#getChangedKeys";
import { LogType } from "@prisma/client";

// Schema for validating updates
const bodySchema = z.object({
  values: z.record(z.string(), z.string()),
});

const passedShiftSchema = z.array(
  z.object({
    id: z.string(),
    eventId: z.string(),
    locationId: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    startTimeTz: z.string(),
    endTimeTz: z.string(),
    capacity: z.number(),
    open: z.boolean(),
    active: z.boolean(),
    deleted: z.boolean(),
  })
);

export const groupByLocationAndJob = (responses) => {
  const result = [];
  const locationMap = new Map();

  responses.forEach(({ shift }) => {
    const { job, ...shiftData } = shift;
    const { location } = job;

    // Get or create the location entry
    let locEntry = locationMap.get(location.id);
    if (!locEntry) {
      locEntry = { ...location, jobs: [] };
      locationMap.set(location.id, locEntry);
      result.push(locEntry);
    }

    // Get or create the job entry within this location
    let jobEntry = locEntry.jobs.find((j) => j.id === job.id);
    if (!jobEntry) {
      // omit nested location on the job object
      // eslint-disable-next-line
      const { location: _, ...jobWithoutLocation } = job;
      jobEntry = { ...jobWithoutLocation, shifts: [] };
      locEntry.jobs.push(jobEntry);
    }

    // Add the shift to this job
    jobEntry.shifts.push(shiftData);
  });

  return result;
};

/**
 * GET → fetch a single submission with flattened values
 */
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, submissionId } = req.params;
    try {
      // Fetch all fields (including deleted ones) with type + options
      const fields = await prisma.formField.findMany({
        where: { eventId, deleted: false },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          options: {
            select: { id: true, label: true, deleted: true },
          },
          deleted: true,
          order: true,
          required: true,
        },
      });

      // Fetch the specific submission
      const resp = await prisma.formResponse.findUnique({
        where: { id: submissionId },
        include: {
          fieldResponses: {
            select: { fieldId: true, value: true, field: true },
          },
          shifts: {
            include: {
              shift: {
                include: {
                  job: {
                    include: {
                      location: true,
                    },
                  },
                },
              },
            },
          },
          pii: true,
        },
      });
      if (!resp || resp.eventId !== eventId) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const shifts = [...resp.shifts];

      const formattedResponse = formatFormResponse(resp, fields);

      const emailField = fields.find((f) => f.label === "Your Email");
      const email = formattedResponse[emailField.id];
      const nameField = fields.find((f) => f.label === "Your Name");
      const name = formattedResponse[nameField.id];
      formattedResponse["flat"] = {
        email,
        name,
      };

      const fieldsMeta = fields.map((f) => ({
        ...f,
        currentlyInForm: !f.deleted,
      }));

      const otherResponsesWithSameFingerprint =
        await prisma.formResponse.findMany({
          where: {
            eventId,
            deleted: false,
            pii: {
              fingerprint: resp.pii?.fingerprint,
            },
            id: {
              not: resp.id,
            },
          },
          orderBy: { createdAt: "asc" },
          include: {
            fieldResponses: {
              select: { fieldId: true, value: true },
            },
          },
        });

      const otherReponsesWithSameFingerprintFormatted =
        otherResponsesWithSameFingerprint.map((r) => {
          const formatted = formatFormResponse(r, fields);
          const nameFieldId = fields.find((f) => f.label === "Your Name")?.id;
          return {
            ...formatted,
            name: formatted[nameFieldId],
          };
        });
      resp.pii.otherResponsesWithSameFingerprint =
        otherReponsesWithSameFingerprintFormatted;

      return res.json({
        response: formattedResponse,
        fields: fieldsMeta,
        pii: resp.pii,
        groupedShifts: groupByLocationAndJob(shifts),
        shifts: shifts.map((shift) => shift.shift),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

/**
 * PUT → update an existing submission by overwriting its fieldResponses
 */
export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { submissionId } = req.params;
    const parse = bodySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: serializeError(parse) });
    }
    const { values } = parse.data;

    try {
      const from = await prisma.formResponse.findUnique({
        where: { id: submissionId },
        include: { fieldResponses: true },
      });

      // Overwrite all existing fieldResponses for this submission
      const updated = await prisma.formResponse.update({
        where: { id: submissionId },
        data: {
          fieldResponses: {
            deleteMany: {},
            create: Object.entries(values).map(([fieldId, value]) => ({
              field: { connect: { id: fieldId } },
              value,
            })),
          },
          updatedAt: new Date(),
        },
      });

      const changedKeys = getChangedKeys(from, updated);
      await prisma.logs.create({
        data: {
          type: LogType.FORM_RESPONSE_MODIFIED,
          userId: req.user.id,
          ip: req.ip,
          data: changedKeys,
          eventId: req.params.eventId,
          formResponseId: updated.id,
        },
      });

      return res.json({ id: updated.id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

/**
 * PATCH → update the shifts for a submission
 */
export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { submissionId } = req.params;
      const parseResult = passedShiftSchema.safeParse(req.body.shifts);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error });
      }

      const incomingShifts = parseResult.data; // array of { id, … }
      const registeredShifts = await prisma.formResponseShift.findMany({
        where: { formResponseId: submissionId },
        select: { id: true, shiftId: true },
      });

      const registeredIds = registeredShifts.map((r) => r.shiftId);
      const incomingIds = incomingShifts.map((i) => i.id);

      // shifts to unregister (delete)
      const toDelete = registeredShifts
        .filter((r) => !incomingIds.includes(r.shiftId))
        .map((r) => r.id);

      // shifts to register (create)
      const toCreate = incomingShifts
        .filter((i) => !registeredIds.includes(i.id))
        .map((i) => ({
          formResponseId: submissionId,
          shiftId: i.id,
        }));

      // apply removals
      if (toDelete.length) {
        await prisma.formResponseShift.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // apply additions (skipDuplicates guards against any unique-constraint conflicts)
      if (toCreate.length) {
        await prisma.formResponseShift.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      }

      return res.json({
        removedCount: toDelete.length,
        addedCount: toCreate.length,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

/**
 * DELETE → remove a submission and its child FieldResponses
 */
export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { submissionId, eventId } = req.params;
    try {
      // Ensure it belongs to this event
      let resp = await prisma.formResponse.findUnique({
        where: { id: submissionId },
      });
      if (!resp || resp.eventId !== eventId) {
        return res.status(404).json({ message: "Submission not found" });
      }

      resp = await prisma.formResponse.update({
        where: { id: submissionId },
        data: { deleted: true },
      });

      await prisma.logs.create({
        data: {
          type: LogType.FORM_RESPONSE_DELETED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          formResponseId: submissionId,
        },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];

export const formatFormResponse = (resp, fields) => {
  const obj = {};
  for (const f of fields) {
    obj[f.id] = null;
  }
  for (const fr of resp.fieldResponses) {
    const field = fields.find((f) => f.id === fr.fieldId);
    if (!field) continue;
    if (field.type === "dropdown") {
      const opt = field.options.find((o) => o.id === fr.value);
      obj[field.id] = opt ? { id: opt.id, label: opt.label } : null;
    } else {
      obj[field.id] = fr.value;
    }
  }
  obj["createdAt"] = resp.createdAt;
  obj["updatedAt"] = resp.updatedAt;
  obj["id"] = resp.id;
  return obj;
};
