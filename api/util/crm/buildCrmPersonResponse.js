import { collapseCrmValues } from "./collapseCrmValues.js";

const EMPTY_PARTICIPANT = {
  total: 0,
  finalized: 0,
  latest: null,
  registrations: [],
  tiers: [],
  periods: [],
  teams: [],
  coupons: [],
  upsells: [],
  fields: {},
};

const EMPTY_VOLUNTEER = {
  total: 0,
  totalShifts: 0,
  latest: null,
  registrations: [],
  jobs: [],
  locations: [],
  fields: {},
};

export const buildCrmPersonResponse = ({
  persons,
  participantStats,
  volunteerStats,
  lifetimeMap,
  emailMap,
}) =>
  persons.map((person) => {
    const participant = participantStats.get(person.id) || EMPTY_PARTICIPANT;
    const volunteer = volunteerStats.get(person.id) || EMPTY_VOLUNTEER;
    return {
      ...person,
      fields: collapseCrmValues(person.fieldValues),
      lifetimeValue: lifetimeMap.get(person.id) ?? 0,
      lastEmailedAt: emailMap.get(person.id) ?? null,
      participantStats: participant,
      volunteerStats: volunteer,
    };
  });
