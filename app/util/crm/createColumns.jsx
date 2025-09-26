import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "tabler-react-2";
import { Icon } from "../Icon";
import { fieldTypeToIcon } from "./fieldTypeToIcon";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const renderLifetimeValue = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "—";
  return currencyFormatter.format(amount);
};

const renderLastEmailed = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const renderEmailOpenRate = (_, row) => {
  const stats = row?.emailStats;
  const sent = Number(stats?.sent || 0);
  const opened = Number(stats?.opened || 0);
  if (!sent) return "—";
  const percent = Math.round((opened / sent) * 100);
  return `${percent}% (${opened}/${sent})`;
};

const renderParticipantTotals = (_, row) => {
  const stats = row?.participantStats;
  if (!stats?.total) return "—";
  const { total, finalized } = stats;
  const badgeColor = finalized === total ? "success" : "secondary";
  const extras = [];
  if (Array.isArray(stats?.tiers) && stats.tiers.length)
    extras.push(
      `Tier${stats.tiers.length > 1 ? "s" : ""}: ${stats.tiers.join(", ")}`
    );
  if (Array.isArray(stats?.periods) && stats.periods.length)
    extras.push(
      `Period${stats.periods.length > 1 ? "s" : ""}: ${stats.periods.join(", ")}`
    );
  if (Array.isArray(stats?.teams) && stats.teams.length)
    extras.push(
      `Team${stats.teams.length > 1 ? "s" : ""}: ${stats.teams.join(", ")}`
    );

  return (
    <div className="d-flex flex-column gap-1">
      <span className="d-inline-flex align-items-center gap-2">
        <span>{`${total} total`}</span>
        <Badge soft color={badgeColor}>{`${finalized} finalized`}</Badge>
      </span>
      {extras.map((line) => (
        <small key={line} className="text-muted text-truncate">
          {line}
        </small>
      ))}
    </div>
  );
};

const renderParticipantLatest = (latest) => {
  if (!latest) return "—";
  const statusLabel = latest.finalized ? "Finalized" : "Pending";
  const badgeColor = latest.finalized ? "success" : "secondary";
  const created = latest.createdAt
    ? new Date(latest.createdAt).toLocaleDateString()
    : null;
  const lines = [];
  if (latest.instanceName) lines.push(`Instance: ${latest.instanceName}`);
  if (latest.tierName) lines.push(`Tier: ${latest.tierName}`);
  if (latest.periodName) lines.push(`Period: ${latest.periodName}`);
  if (latest.teamName) lines.push(`Team: ${latest.teamName}`);
  const fields = Array.isArray(latest.fieldValues) ? latest.fieldValues : [];
  return (
    <div className="d-flex flex-column gap-1">
      <span className="d-inline-flex align-items-center gap-2">
        <span>{created ? `Created ${created}` : "Registration"}</span>
        <Badge soft color={badgeColor}>{statusLabel}</Badge>
      </span>
      {lines.map((line) => (
        <small key={line} className="text-muted text-truncate">
          {line}
        </small>
      ))}
      {fields.length ? (
        <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
          {fields.map((field) => (
            <div key={field.fieldId ?? field.label} className="text-truncate">
              <strong>{field.label}:</strong> {field.value}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const renderVolunteerTotals = (_, row) => {
  const stats = row?.volunteerStats;
  if (!stats?.total) return "—";
  const totalShifts = Number.isFinite(stats.totalShifts)
    ? stats.totalShifts
    : 0;
  const base = `${stats.total} reg${stats.total === 1 ? "" : "s"} • ${
    totalShifts
  } shift${totalShifts === 1 ? "" : "s"}`;
  const extras = [];
  if (Array.isArray(stats?.jobs) && stats.jobs.length)
    extras.push(`Jobs: ${stats.jobs.join(", ")}`);
  if (Array.isArray(stats?.locations) && stats.locations.length)
    extras.push(`Locations: ${stats.locations.join(", ")}`);

  return (
    <div className="d-flex flex-column gap-1">
      <span>{base}</span>
      {extras.map((line) => (
        <small key={line} className="text-muted text-truncate">
          {line}
        </small>
      ))}
    </div>
  );
};

const renderVolunteerLatest = (latest) => {
  if (!latest) return "—";
  const lines = [];
  if (latest.instanceName) lines.push(`Instance: ${latest.instanceName}`);
  if (Number.isFinite(latest.shiftCount))
    lines.push(`Shifts: ${latest.shiftCount}`);
  if (Array.isArray(latest.jobNames) && latest.jobNames.length)
    lines.push(`Jobs: ${latest.jobNames.join(", ")}`);
  if (Array.isArray(latest.locationNames) && latest.locationNames.length)
    lines.push(`Locations: ${latest.locationNames.join(", ")}`);
  if (!lines.length) lines.push("Registration");
  const fields = Array.isArray(latest.fieldValues) ? latest.fieldValues : [];

  return (
    <div className="d-flex flex-column gap-1">
      {lines.map((line) => (
        <small key={line} className="text-muted text-truncate">
          {line}
        </small>
      ))}
      {fields.length ? (
        <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
          {fields.map((field) => (
            <div key={field.fieldId ?? field.label} className="text-truncate">
              <strong>{field.label}:</strong> {field.value}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const renderList = (value) => {
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.join(", ");
  }
  if (value == null || value === "") return "—";
  return value;
};

const slugify = (input = "") =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "field";

const hashLabel = (label = "") => {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const participantFieldColumnId = (label) =>
  `participant-field-${slugify(label)}-${hashLabel(label)}`;

export const volunteerFieldColumnId = (label) =>
  `volunteer-field-${slugify(label)}-${hashLabel(label)}`;

export const buildParticipantFieldColumn = (label) => ({
  id: participantFieldColumnId(label),
  label,
  order: 0,
  show: false,
  accessor: (row) => row?.participantStats?.fields?.[label] ?? "",
  render: (value) => (value ? value : "—"),
  sortable: false,
  icon: <Icon i="forms" />,
});

export const buildVolunteerFieldColumn = (label) => ({
  id: volunteerFieldColumnId(label),
  label,
  order: 0,
  show: false,
  accessor: (row) => row?.volunteerStats?.fields?.[label] ?? "",
  render: (value) => (value ? value : "—"),
  sortable: false,
  icon: <Icon i="forms" />,
});

export const createBaseColumns = (onViewPerson) => [
  {
    id: "name",
    label: "Name",
    order: 1,
    show: true,
    accessor: "name",
    sortable: true,
    icon: <Icon i="id-badge-2" />,
    render: (value, row) => {
      const id = row?.id;
      if (
        !id ||
        typeof value !== "string" ||
        value.trim().length === 0 ||
        typeof onViewPerson !== "function"
      )
        return value;
      const href = onViewPerson(id);
      if (!href) return value;
      return <Link to={href}>{value}</Link>;
    },
  },
  {
    id: "emails",
    label: "Email",
    order: 2,
    show: true,
    accessor: "emails",
    render: (emails) => emails.map((email) => email.email).join(", "),
    sortable: true,
    icon: <Icon i="mail" />,
  },
  {
    id: "phones",
    label: "Phone",
    order: 3,
    show: true,
    accessor: "phones",
    render: (phones) => phones.map((phone) => phone.phone).join(", "),
    sortable: true,
    icon: <Icon i="phone" />,
  },
  {
    id: "createdAt",
    label: "Created At",
    order: 4,
    show: true,
    accessor: "createdAt",
    render: (value) => new Date(value).toLocaleDateString(),
    sortable: true,
    icon: <Icon i="calendar" />,
  },
  {
    id: "source",
    label: "Source",
    order: 5,
    show: true,
    accessor: "source",
    render: (value) => <Badge outline>{value}</Badge>,
    sortable: true,
  },
  {
    id: "lifetimeValue",
    label: "Lifetime Value",
    order: 6,
    show: false,
    accessor: "lifetimeValue",
    render: renderLifetimeValue,
    sortable: true,
    icon: <Icon i="currency-dollar" />,
  },
  {
    id: "lastEmailedAt",
    label: "Last Emailed",
    order: 7,
    show: false,
    accessor: "lastEmailedAt",
    render: renderLastEmailed,
    sortable: false,
    icon: <Icon i="mail" />,
  },
  {
    id: "emailOpenRate",
    label: "Email Open Rate",
    order: 8,
    show: false,
    accessor: "emailOpenRate",
    render: renderEmailOpenRate,
    sortable: false,
    icon: <Icon i="percentage" />,
  },
  {
    id: "registrationPeriod",
    label: "Registration Period",
    order: 9,
    show: false,
    accessor: (row) => row?.participantStats?.periods ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="calendar-event" />,
  },
  {
    id: "registrationTier",
    label: "Registration Tier",
    order: 10,
    show: false,
    accessor: (row) => row?.participantStats?.tiers ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="ticket" />,
  },
  {
    id: "registrationTeam",
    label: "Team",
    order: 11,
    show: false,
    accessor: (row) => row?.participantStats?.teams ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="users" />,
  },
  {
    id: "registrationCoupon",
    label: "Coupon",
    order: 12,
    show: false,
    accessor: (row) => row?.participantStats?.coupons ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="discount-2" />,
  },
  {
    id: "registrationUpsells",
    label: "Upsell Participation",
    order: 13,
    show: false,
    accessor: (row) => row?.participantStats?.upsells ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="shopping-cart" />,
  },
  {
    id: "volunteerLocations",
    label: "Volunteer Locations",
    order: 14,
    show: false,
    accessor: (row) => row?.volunteerStats?.locations ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="map-pin" />,
  },
  {
    id: "volunteerJobs",
    label: "Volunteer Jobs",
    order: 15,
    show: false,
    accessor: (row) => row?.volunteerStats?.jobs ?? [],
    render: renderList,
    sortable: false,
    icon: <Icon i="briefcase" />,
  },
];

export const buildDynamicColumn = (field) => ({
  id: `field-${field.id}`,
  label: field.label,
  order: 0,
  show: field.showInGeneralTable,
  accessor: `fields.${field.id}`,
  render: (value) =>
    field.type === "DATE" && value ? new Date(value).toLocaleDateString() : value,
  sortable: true,
  sortFn:
    field.type === "DATE"
      ? (a, b) => {
          const ta = new Date(a).getTime();
          const tb = new Date(b).getTime();
          if (!ta) return 1;
          if (!tb) return -1;
          return ta - tb;
        }
      : field.type === "NUMBER"
      ? (a, b) => {
          const na = parseFloat(a);
          const nb = parseFloat(b);
          if (!na) return 1;
          if (!nb) return -1;
          return na - nb;
        }
      : field.type === "BOOLEAN"
      ? (a, b) => (a === "true" ? 1 : -1)
      : undefined,
  icon: <Icon i={fieldTypeToIcon(field.type)} />,
});
