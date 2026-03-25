import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";
import { formatFormResponse, groupByLocationAndJob } from "./[volunteerId]";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
  orderBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const normalizeOrder = (order) => (order === "asc" ? "asc" : "desc");

const getVolunteerFields = async (eventId, instanceId) => {
  const fields = await prisma.volunteerRegistrationField.findMany({
    where: { eventId, instanceId, deleted: false },
    orderBy: { order: "asc" },
    select: {
      id: true,
      label: true,
      type: true,
      eventpilotFieldType: true,
      required: true,
      order: true,
      options: {
        where: { deleted: false },
        select: { id: true, label: true },
        orderBy: { order: "asc" },
      },
    },
  });

  const byId = new Map(fields.map((field) => [field.id, field]));
  const byPilotType = new Map();

  fields.forEach((field) => {
    if (field?.eventpilotFieldType) {
      byPilotType.set(field.eventpilotFieldType, field);
    }
  });

  return { fields, byId, byPilotType };
};

const normalizeOrderBy = ({ orderBy, byId, byPilotType }) => {
  if (orderBy === "name") {
    const nameField = byPilotType.get("volunteerName");
    return nameField ? `field:${nameField.id}` : "createdAt";
  }

  if (orderBy === "email") {
    const emailField = byPilotType.get("volunteerEmail");
    return emailField ? `field:${emailField.id}` : "createdAt";
  }

  if (orderBy?.startsWith?.("field:")) {
    const fieldId = orderBy.slice(6);
    return fieldId && byId.has(fieldId) ? orderBy : "createdAt";
  }

  if (orderBy === "createdAt" || orderBy === "updatedAt") {
    return orderBy;
  }

  return "createdAt";
};

const formatFieldValue = (field, value) => {
  if (value == null) return null;

  if (field?.type === "dropdown") {
    if (value && typeof value === "object" && "label" in value) {
      return value.label;
    }

    return String(value ?? "");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value ?? "");
};

const getComparableFieldResponseValue = (field, responseValue) => {
  if (responseValue == null) return null;

  if (field?.type === "dropdown") {
    const option = field.options?.find((entry) => entry.id === responseValue);
    return option?.label ?? String(responseValue);
  }

  return String(responseValue);
};


const includesNeedle = (value, needle) =>
  value != null && String(value).toLowerCase().includes(needle);

const matchesSearch = (entry, term) => {
  if (!term) return true;

  const needle = term.toLowerCase();

  const matchesFieldResponse = entry.searchableValues.some((value) =>
    includesNeedle(value, needle),
  );

  if (matchesFieldResponse) return true;

  const matchesShift = entry.record.shifts?.some(({ shift }) => {
    const shiftLocationName =
      shift?.location?.name ?? shift?.job?.location?.name;

    return (
      includesNeedle(shift?.job?.name, needle) ||
      includesNeedle(shiftLocationName, needle)
    );
  });

  if (matchesShift) return true;

  return includesNeedle(entry.record.instance?.name, needle);
};

const compareValues = (left, right) => {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

const sortVolunteerEntries = ({ entries, orderBy, order, fieldById }) => {
  const direction = order === "asc" ? 1 : -1;

  const compareNullableValues = (leftValue, rightValue) => {
    if (leftValue == null && rightValue == null) return 0;
    if (leftValue == null) return 1;
    if (rightValue == null) return -1;
    return compareValues(leftValue, rightValue) * direction;
  };

  return [...entries].sort((left, right) => {
    let comparison = 0;

    if (orderBy === "updatedAt") {
      comparison = compareNullableValues(
        left.record.updatedAt,
        right.record.updatedAt,
      );
    } else if (orderBy === "createdAt") {
      comparison = compareNullableValues(
        left.record.createdAt,
        right.record.createdAt,
      );
    } else if (orderBy?.startsWith("field:")) {
      const fieldId = orderBy.slice(6);
      const field = fieldById.get(fieldId);
      const leftValue = field ? left.fieldDisplay[field.id] : null;
      const rightValue = field ? right.fieldDisplay[field.id] : null;
      comparison = compareNullableValues(leftValue, rightValue);
    }

    if (comparison !== 0) {
      return comparison;
    }

    return compareValues(right.record.createdAt, left.record.createdAt);
  });
};

const mapVolunteerRecord = ({ record, fields, nameField, emailField }) => {
  const formatted = formatFormResponse(record, fields);
  const fieldValues = {};
  const fieldDisplay = {};

  fields.forEach((field) => {
    const raw = formatted[field.id];
    fieldValues[field.id] = raw ?? null;
    fieldDisplay[field.id] = formatFieldValue(field, raw);
  });

  const groupedShifts = groupByLocationAndJob(record.shifts || []);
  const jobs = new Set();
  const locations = new Set();
  const shiftDetails = [];

  record.shifts?.forEach((signup) => {
    const shift = signup.shift;
    if (!shift) return;

    const job = shift.job;
    const location = job?.location;

    if (job?.name) jobs.add(job.name);
    if (location?.name) locations.add(location.name);

    shiftDetails.push({
      id: shift.id,
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      locationId: location?.id ?? null,
      locationName: location?.name ?? null,
      startTime: shift.startTime,
      endTime: shift.endTime,
      startTimeTz: shift.startTimeTz,
      endTimeTz: shift.endTimeTz,
    });
  });

  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    instanceId: record.instanceId,
    instanceName: record.instance?.name ?? null,
    fields: fieldValues,
    fieldDisplay,
    jobs: Array.from(jobs),
    locations: Array.from(locations),
    shiftCount: shiftDetails.length,
    shifts: shiftDetails,
    groupedShifts,
    flat: {
      name: nameField ? (fieldDisplay[nameField.id] ?? null) : null,
      email: emailField ? (fieldDisplay[emailField.id] ?? null) : null,
    },
  };
};

const buildVolunteerEntry = ({ record, fields, fieldById }) => {
  const formatted = formatFormResponse(record, fields);
  const fieldDisplay = {};

  fields.forEach((field) => {
    fieldDisplay[field.id] = formatFieldValue(field, formatted[field.id]);
  });

  const searchableValues = [];
  record.fieldResponses?.forEach((response) => {
    if (response.value != null) {
      searchableValues.push(response.value);
    }

    const field = response.field || fieldById.get(response.fieldId);
    const displayValue = getComparableFieldResponseValue(field, response.value);
    if (displayValue != null) {
      searchableValues.push(displayValue);
    }
  });

  return {
    record,
    fieldDisplay,
    searchableValues,
  };
};

export const get = [
  verifyAuth(["manager", "dod:volunteer"]),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;
    const parseResult = querySchema.safeParse(req.query);

    if (!parseResult.success) {
      return res
        .status(400)
        .json({ message: "Invalid query", details: parseResult.error.issues });
    }

    const { page, size } = parseResult.data;
    const order = normalizeOrder(parseResult.data.order);

    try {
      const { fields, byId, byPilotType } = await getVolunteerFields(
        eventId,
        instanceId,
      );

      const orderBy = normalizeOrderBy({
        orderBy: parseResult.data.orderBy || "createdAt",
        byId,
        byPilotType,
      });

      if (!byId.size) {
        return res.json({
          meta: { page, size, total: 0, orderBy, order },
          fields,
          rows: [],
        });
      }

      const searchTerm =
        typeof req.query.q === "string" ? req.query.q.trim() : "";

      const registrations = await prisma.volunteerRegistration.findMany({
        where: {
          eventId,
          deleted: false,
          ...(instanceId ? { instanceId } : {}),
        },
        include: {
          fieldResponses: {
            select: {
              fieldId: true,
              value: true,
              field: {
                select: {
                  id: true,
                  label: true,
                  type: true,
                  eventpilotFieldType: true,
                  options: {
                    select: { id: true, label: true, deleted: true },
                  },
                },
              },
            },
          },
          shifts: {
            include: {
              shift: {
                include: {
                  location: {
                    select: { id: true, name: true },
                  },
                  job: {
                    include: {
                      location: true,
                    },
                  },
                },
              },
            },
          },
          instance: {
            select: { id: true, name: true },
          },
        },
      });

      const entries = registrations.map((record) =>
        buildVolunteerEntry({
          record,
          fields,
          fieldById: byId,
        }),
      );

      const filteredEntries = entries.filter((entry) =>
        matchesSearch(entry, searchTerm),
      );

      const sortedEntries = sortVolunteerEntries({
        entries: filteredEntries,
        orderBy,
        order,
        fieldById: byId,
      });

      const total = sortedEntries.length;
      const offset = (page - 1) * size;
      const pagedEntries = sortedEntries.slice(offset, offset + size);
      const nameField = byPilotType.get("volunteerName") || null;
      const emailField = byPilotType.get("volunteerEmail") || null;

      const rows = pagedEntries.map(({ record }) =>
        mapVolunteerRecord({
          record,
          fields,
          nameField,
          emailField,
        }),
      );

      return res.json({
        meta: { page, size, total, orderBy, order },
        fields,
        rows,
      });
    } catch (error) {
      console.error(error);
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];
