import { useMemo } from "react";

const BASE_FILTERS = [
  {
    label: "source",
    hrTitle: "Acquisition Source",
    type: "enum",
    options: [
      "MANUAL",
      "IMPORT",
      "VOLUNTEER",
      "REGISTRATION",
      "SENT_EMAIL",
      "EMAIL",
    ],
    defaultOperation: "eq",
  },
  {
    label: "createdAt",
    hrTitle: "Created Date",
    type: "date",
    defaultOperation: "date-after",
    accessor: (p) => p.createdAt,
  },
  {
    label: "updatedAt",
    hrTitle: "Updated Date",
    type: "date",
    defaultOperation: "date-after",
    accessor: (p) => p.updatedAt,
  },
  {
    label: "name",
    hrTitle: "Name",
    type: "text",
    defaultOperation: "contains",
    accessor: (p) => p.name,
  },
  {
    label: "emails",
    hrTitle: "Email",
    type: "text",
    defaultOperation: "contains",
    accessor: (p) => (p.emails || []).map((e) => e.email).join(", "),
  },
  {
    label: "phones",
    hrTitle: "Phone",
    type: "text",
    defaultOperation: "contains",
    accessor: (p) => (p.phones || []).map((ph) => ph.phone).join(", "),
  },
  {
    label: "stripe_customerId",
    hrTitle: "Stripe Customer ID",
    type: "text",
    defaultOperation: "contains",
    accessor: (p) => p.stripe_customerId,
  },
];

const mapCrmFieldType = (type) => {
  switch (type) {
    case "DATE":
      return "date";
    case "NUMBER":
      return "number";
    case "BOOLEAN":
      return "boolean";
    default:
      return "text";
  }
};

export const useCrmFilterDefinitions = (crmFields = []) => {
  return useMemo(() => {
    const dynamic = (crmFields || []).map((field) => ({
      label: field.label,
      hrTitle: field.label,
      type: mapCrmFieldType(field.type),
      defaultOperation:
        field.type === "DATE"
          ? "date-after"
          : field.type === "NUMBER"
          ? "greater-than"
          : field.type === "BOOLEAN"
          ? "eq"
          : "contains",
      options: field.type === "BOOLEAN" ? ["true", "false"] : undefined,
      accessor: (person) => person?.fields?.[field.id],
    }));

    return [...BASE_FILTERS, ...dynamic];
  }, [crmFields]);
};
