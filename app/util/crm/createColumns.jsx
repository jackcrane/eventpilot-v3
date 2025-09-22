import React from "react";
import { Button, Badge } from "tabler-react-2";
import { Icon } from "../Icon";
import { fieldTypeToIcon } from "./fieldTypeToIcon";

export const createBaseColumns = (onViewPerson) => [
  {
    id: "actions",
    label: "Actions",
    order: 1,
    show: true,
    accessor: "id",
    render: (id) => (
      <Button size="sm" onClick={() => onViewPerson(id)}>
        <Icon i="info-circle" /> Details
      </Button>
    ),
    sortable: false,
  },
  {
    id: "name",
    label: "Name",
    order: 2,
    show: true,
    accessor: "name",
    sortable: true,
    icon: <Icon i="id-badge-2" />,
  },
  {
    id: "emails",
    label: "Email",
    order: 3,
    show: true,
    accessor: "emails",
    render: (emails) => emails.map((email) => email.email).join(", "),
    sortable: true,
    icon: <Icon i="mail" />,
  },
  {
    id: "phones",
    label: "Phone",
    order: 4,
    show: true,
    accessor: "phones",
    render: (phones) => phones.map((phone) => phone.phone).join(", "),
    sortable: true,
    icon: <Icon i="phone" />,
  },
  {
    id: "createdAt",
    label: "Created At",
    order: 5,
    show: true,
    accessor: "createdAt",
    render: (value) => new Date(value).toLocaleDateString(),
    sortable: true,
    icon: <Icon i="calendar" />,
  },
  {
    id: "source",
    label: "Source",
    order: 6,
    show: true,
    accessor: "source",
    render: (value) => <Badge outline>{value}</Badge>,
    sortable: true,
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
