import { formatFieldResponses } from "./formatFieldResponses.js";

const sortValues = (values) =>
  Array.from(values).sort((a, b) => a.localeCompare(b));

export const createVolunteerStatsMap = (registrations = []) => {
  const accumulator = new Map();

  for (const reg of registrations) {
    const personId = reg.crmPersonLink?.crmPersonId;
    if (!personId) continue;
    let summary = accumulator.get(personId);
    if (!summary) {
      summary = {
        total: 0,
        totalShifts: 0,
        latest: null,
        registrations: [],
        jobNames: new Set(),
        locationNames: new Set(),
        fieldValues: new Map(),
      };
      accumulator.set(personId, summary);
    }

    const jobNames = new Set();
    const locationNames = new Set();
    for (const signup of reg.shifts || []) {
      const shiftJob = signup.shift?.job;
      if (shiftJob?.name) jobNames.add(shiftJob.name);
      if (shiftJob?.location?.name) locationNames.add(shiftJob.location.name);
      if (signup.shift?.location?.name)
        locationNames.add(signup.shift.location.name);
    }

    const detail = {
      id: reg.id,
      createdAt: reg.createdAt,
      instanceId: reg.instance?.id ?? null,
      instanceName: reg.instance?.name ?? null,
      shiftCount: (reg.shifts || []).length,
      jobNames: Array.from(jobNames),
      locationNames: Array.from(locationNames),
      fieldValues: formatFieldResponses(reg.fieldResponses),
    };

    summary.total += 1;
    summary.totalShifts += detail.shiftCount;
    summary.registrations.push(detail);
    detail.jobNames.forEach((name) => summary.jobNames.add(name));
    detail.locationNames.forEach((name) => summary.locationNames.add(name));

    if (detail.fieldValues?.length) {
      for (const field of detail.fieldValues) {
        const label = field.label;
        const value = field.value;
        if (!label || !value) continue;
        const existing = summary.fieldValues.get(label) || new Set();
        existing.add(value);
        summary.fieldValues.set(label, existing);
      }
    }
    if (!summary.latest) summary.latest = detail;
  }

  return new Map(
    [...accumulator.entries()].map(([personId, summary]) => [
      personId,
      {
        total: summary.total,
        totalShifts: summary.totalShifts,
        latest: summary.latest,
        registrations: summary.registrations,
        jobs: sortValues(summary.jobNames),
        locations: sortValues(summary.locationNames),
        fields: (() => {
          const output = {};
          for (const [label, values] of summary.fieldValues.entries()) {
            output[label] = Array.from(values).join(", ");
          }
          return output;
        })(),
      },
    ])
  );
};
