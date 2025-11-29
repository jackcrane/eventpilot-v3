const COLUMN_FEATURES = {
  lastEmailedAt: "lastEmailedAt",
  registrationPeriod: "participantStats",
  registrationTier: "participantStats",
  registrationTeam: "participantStats",
  registrationCoupon: "participantStats",
  registrationUpsells: "participantStats",
  participantTotals: "participantStats",
  participantLatest: "participantStats",
  volunteerLocations: "volunteerStats",
  volunteerJobs: "volunteerStats",
  volunteerTotals: "volunteerStats",
  volunteerLatest: "volunteerStats",
};

const COLUMN_PREFIX_FEATURES = [
  { prefix: "field-", feature: "customFields" },
  { prefix: "participant-field-", feature: "participantStats" },
  { prefix: "volunteer-field-", feature: "volunteerStats" },
];

/**
 * Returns a deterministic list of data requirements derived from the provided columns.
 * @param {Array<{id?: string}>} columns
 * @returns {string[]} sorted feature identifiers
 */
export const getCrmDataRequirements = (columns = []) => {
  const requirements = new Set();
  columns.forEach((column) => {
    const id = column?.id;
    if (typeof id !== "string" || !id) return;
    if (COLUMN_FEATURES[id]) requirements.add(COLUMN_FEATURES[id]);
    COLUMN_PREFIX_FEATURES.forEach(({ prefix, feature }) => {
      if (id.startsWith(prefix)) requirements.add(feature);
    });
  });
  return Array.from(requirements).sort();
};

