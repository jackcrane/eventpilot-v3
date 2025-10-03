import { Button, Badge } from "tabler-react-2";
import moment from "moment";
import { DATETIME_FORMAT } from "../Constants";
import { Icon } from "../../util/Icon";

const formatDateTime = (value) => {
  if (!value) return "—";
  const formatted = moment(value).format(DATETIME_FORMAT);
  return formatted && formatted !== "Invalid date" ? formatted : "—";
};

const formatList = (value) => {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return value.join(", ");
};

export const buildVolunteerColumns = ({ fields = [], onOpenDetails }) => {
  const nameField = fields.find(
    (field) => field?.eventpilotFieldType === "volunteerName"
  );
  const emailField = fields.find(
    (field) => field?.eventpilotFieldType === "volunteerEmail"
  );

  const columns = [
    {
      id: "details",
      label: "Details",
      order: 1,
      show: true,
      enableSorting: false,
      column: {
        id: "details",
        header: () => "Details",
        cell: ({ row }) => (
          <Button
            size="sm"
            disabled={typeof onOpenDetails !== "function"}
            onClick={() =>
              typeof onOpenDetails === "function"
                ? onOpenDetails(row?.original?.id)
                : undefined
            }
            icon={<Icon i="info-circle" />}
            variant="light"
          >
            View
          </Button>
        ),
        size: 90,
      },
    },
    {
      id: "name",
      label: "Name",
      order: 2,
      show: true,
      enableSorting: Boolean(nameField),
      orderBy: nameField ? `field:${nameField.id}` : null,
      column: {
        id: "name",
        header: () => "Name",
        accessorFn: (row) => row?.flat?.name ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "email",
      label: "Email",
      order: 3,
      show: true,
      enableSorting: Boolean(emailField),
      orderBy: emailField ? `field:${emailField.id}` : null,
      column: {
        id: "email",
        header: () => "Email",
        accessorFn: (row) => row?.flat?.email ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "instance",
      label: "Instance",
      order: 4,
      show: false,
      enableSorting: false,
      column: {
        id: "instance",
        header: () => "Instance",
        accessorFn: (row) => row?.instanceName ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "createdAt",
      label: "Submitted",
      order: 5,
      show: true,
      enableSorting: true,
      orderBy: "createdAt",
      column: {
        id: "createdAt",
        header: () => "Submitted",
        accessorFn: (row) => row?.createdAt ?? null,
        cell: ({ getValue }) => formatDateTime(getValue()),
      },
    },
    {
      id: "updatedAt",
      label: "Updated",
      order: 6,
      show: false,
      enableSorting: true,
      orderBy: "updatedAt",
      column: {
        id: "updatedAt",
        header: () => "Updated",
        accessorFn: (row) => row?.updatedAt ?? null,
        cell: ({ getValue }) => formatDateTime(getValue()),
      },
    },
    {
      id: "shiftCount",
      label: "Shifts",
      order: 7,
      show: true,
      enableSorting: false,
      column: {
        id: "shiftCount",
        header: () => "Shifts",
        accessorFn: (row) => row?.shiftCount ?? 0,
        cell: ({ getValue }) => {
          const count = Number(getValue() ?? 0);
          if (!Number.isFinite(count)) return "—";
          if (count === 0) return "—";
          return (
            <Badge soft color="primary">
              {count}
            </Badge>
          );
        },
        size: 80,
      },
    },
    {
      id: "jobs",
      label: "Jobs",
      order: 8,
      show: true,
      enableSorting: false,
      column: {
        id: "jobs",
        header: () => "Jobs",
        accessorFn: (row) => row?.jobs ?? [],
        cell: ({ getValue }) => formatList(getValue()),
      },
    },
    {
      id: "locations",
      label: "Locations",
      order: 9,
      show: true,
      enableSorting: false,
      column: {
        id: "locations",
        header: () => "Locations",
        accessorFn: (row) => row?.locations ?? [],
        cell: ({ getValue }) => formatList(getValue()),
      },
    },
  ];

  let nextOrder = columns.length + 1;
  fields
    .filter(
      (field) => field.id !== nameField?.id && field.id !== emailField?.id
    )
    .forEach((field) => {
      const label = field.label || "Field";
      columns.push({
        id: `field-${field.id}`,
        label,
        order: nextOrder,
        show: false,
        enableSorting: true,
        orderBy: `field:${field.id}`,
        column: {
          id: `field-${field.id}`,
          header: () => label,
          accessorFn: (row) => row?.fieldDisplay?.[field.id] ?? null,
          cell: ({ getValue }) => getValue() || "—",
        },
      });
      nextOrder += 1;
    });

  return columns;
};
