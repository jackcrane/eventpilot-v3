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

  responses.forEach(({ shift, checkedInAt, checkedInBy }) => {
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
    jobEntry.shifts.push({
      ...shiftData,
      checkedInAt,
      checkedInBy,
    });
  });

  return result;
};

export const findSubmission = async (eventId, submissionId) => {
  // Load the submission first so we can scope fields by instance
  const resp = await prisma.volunteerRegistration.findUnique({
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
          checkedInBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      pii: true,
    },
  });

  if (!resp || resp.eventId !== eventId) {
    throw new Error("Submission not found");
  }

  // Fetch fields for the same instance as the submission to avoid cross-instance mismatches
  const fields = await prisma.volunteerRegistrationField.findMany({
    where: { eventId, instanceId: resp.instanceId, deleted: false },
    orderBy: { order: "asc" },
    select: {
      id: true,
      label: true,
      type: true,
      eventpilotFieldType: true,
      options: {
        select: { id: true, label: true, deleted: true },
      },
      deleted: true,
      order: true,
      required: true,
    },
  });

  const shifts = resp.shifts.map((signup) => ({
    shift: signup.shift,
    checkedInAt: signup.checkedInAt,
    checkedInBy: signup.checkedInBy
      ? {
          id: signup.checkedInBy.id,
          name: signup.checkedInBy.name,
        }
      : null,
  }));
  const formattedResponse = formatFormResponse(resp, fields);

  // Robustly resolve special fields (prefer eventpilotFieldType, then fallbacks)
  const resolveField = (
    fieldsArr,
    { preferredType, fallbackType, labelMatch }
  ) => {
    return (
      fieldsArr.find((f) => f.eventpilotFieldType === preferredType) ||
      (fallbackType
        ? fieldsArr.find((f) => (f.type || "").toLowerCase() === fallbackType)
        : null) ||
      (labelMatch ? fieldsArr.find((f) => labelMatch(f.label || "")) : null) ||
      null
    );
  };

  const emailField = resolveField(fields, {
    preferredType: "volunteerEmail",
    fallbackType: "email",
    labelMatch: (l) => l.trim().toLowerCase() === "your email",
  });
  const nameField = resolveField(fields, {
    preferredType: "volunteerName",
    fallbackType: null,
    labelMatch: (l) =>
      l.trim().toLowerCase() === "your name" ||
      l.toLowerCase().includes("name"),
  });

  const email = emailField ? formattedResponse[emailField.id] : undefined;
  const name = nameField ? formattedResponse[nameField.id] : undefined;
  formattedResponse["flat"] = { email, name };

  const fieldsMeta = fields.map((f) => ({
    ...f,
    currentlyInForm: !f.deleted,
  }));

  const otherResponsesWithSameFingerprint =
    await prisma.volunteerRegistration.findMany({
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

  const otherResponsesWithSameFingerprintFormatted =
    otherResponsesWithSameFingerprint.map((r) => {
      const formatted = formatFormResponse(r, fields);
      const nameFieldResolved = resolveField(fields, {
        preferredType: "volunteerName",
        fallbackType: null,
        labelMatch: (l) =>
          l.trim().toLowerCase() === "your name" ||
          l.toLowerCase().includes("name"),
      });
      const nameFieldId = nameFieldResolved?.id;
      return {
        ...formatted,
        name: nameFieldId ? formatted[nameFieldId] : undefined,
      };
    });

  resp.pii.otherResponsesWithSameFingerprint =
    otherResponsesWithSameFingerprintFormatted;

  return {
    response: formattedResponse,
    fields: fieldsMeta,
    pii: resp.pii,
    groupedShifts: groupByLocationAndJob(shifts),
    shifts: shifts.map((s) => ({
      ...s.shift,
      checkedInAt: s.checkedInAt,
      checkedInBy: s.checkedInBy,
    })),
  };
};

/**
 * GET → fetch a single submission with flattened values
 */
export const get = [
  verifyAuth(["manager", "dod:volunteer"]),
  async (req, res) => {
    const { eventId, submissionId } = req.params;

    try {
      const result = await findSubmission(eventId, submissionId);
      return res.json(result);
    } catch (error) {
      console.error(error);
      const code = error.message === "Submission not found" ? 404 : 500;
      return res.status(code).json({ message: error.message });
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
      const from = await prisma.volunteerRegistration.findUnique({
        where: { id: submissionId },
        include: { fieldResponses: true },
      });

      // Overwrite all existing fieldResponses for this submission
      const updated = await prisma.volunteerRegistration.update({
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
      reportApiError(error, req);
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
      const registeredShifts = await prisma.volunteerShiftSignup.findMany({
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
        await prisma.volunteerShiftSignup.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // apply additions (skipDuplicates guards against any unique-constraint conflicts)
      if (toCreate.length) {
        await prisma.volunteerShiftSignup.createMany({
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
      reportApiError(error, req);
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
      let resp = await prisma.volunteerRegistration.findUnique({
        where: { id: submissionId },
      });
      if (!resp || resp.eventId !== eventId) {
        return res.status(404).json({ message: "Submission not found" });
      }

      resp = await prisma.volunteerRegistration.update({
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
      reportApiError(error, req);
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
    // Prefer hydrated field on the response, otherwise fall back to provided list
    const hydratedField = fr.field;
    const fallbackField = fields.find((f) => f.id === fr.fieldId);
    const field = hydratedField || fallbackField;
    if (!field) continue;

    if (field.type === "dropdown") {
      const fieldOptions =
        hydratedField?.options || fallbackField?.options || [];
      const opt = fieldOptions.find((o) => o.id === fr.value);
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
