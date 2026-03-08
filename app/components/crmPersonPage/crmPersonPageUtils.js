const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const SOURCE_LABELS = {
  MANUAL: "Manually added",
  IMPORT: "Imported from CSV",
  VOLUNTEER: "Volunteer registration",
  SENT_EMAIL: "Sent email",
  EMAIL: "Inbound email",
  REGISTRATION: "Registration",
};

export const formatCurrency = (value) =>
  currencyFormatter.format(Number(value || 0));

export const formatDate = (value, fallback = "None") =>
  value ? dateFormatter.format(new Date(value)) : fallback;

export const formatDateTime = (value, fallback = "None") =>
  value ? dateTimeFormatter.format(new Date(value)) : fallback;

export const getSourceLabel = (source) =>
  SOURCE_LABELS[source] || source || "Unknown";

export const extractInitials = (name = "") => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "CR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export const getPrimaryEmail = (crmPerson) =>
  crmPerson?.emails?.find((email) => email?.email) ?? null;

export const getPrimaryPhone = (crmPerson) =>
  crmPerson?.phones?.find((phone) => phone?.phone) ?? null;

export const buildPersonEmailTimeline = (crmPerson) => {
  const inbound = (crmPerson?.inboundEmails || []).map((email) => ({
    id: email.id,
    createdAt: email.createdAt || email.receivedAt,
    direction: "inbound",
  }));

  const outbound = (crmPerson?.sentEmails || []).map((email) => ({
    id: email.id,
    createdAt: email.createdAt,
    direction: "outbound",
  }));

  return [...inbound, ...outbound].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

export const buildCustomFieldRows = ({ crmFields = [], fields = {} }) =>
  crmFields
    .map((field) => ({
      id: field.id,
      label: field.label,
      value: fields?.[field.id],
    }))
    .filter((field) => {
      if (Array.isArray(field.value)) return field.value.length > 0;
      return String(field.value ?? "").trim().length > 0;
    });

export const buildInvolvementSummary = (involvement = []) =>
  involvement.reduce(
    (summary, instanceEntry) => {
      const volunteerRegistrations =
        instanceEntry?.volunteer?.registrations?.length || 0;
      const volunteerShifts = instanceEntry?.volunteer?.shiftCount || 0;
      const participantRegistrations =
        instanceEntry?.participant?.registrations?.length || 0;

      if (volunteerRegistrations > 0 || participantRegistrations > 0) {
        summary.instanceCount += 1;
      }

      summary.volunteerRegistrations += volunteerRegistrations;
      summary.volunteerShifts += volunteerShifts;
      summary.participantRegistrations += participantRegistrations;

      return summary;
    },
    {
      instanceCount: 0,
      volunteerRegistrations: 0,
      volunteerShifts: 0,
      participantRegistrations: 0,
    }
  );

export const getMostRecentTimestamp = (...groups) => {
  const timestamps = groups
    .flat()
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
};
