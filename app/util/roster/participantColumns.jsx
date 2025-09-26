import { Badge } from "tabler-react-2";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return currencyFormatter.format(amount);
};

const formatList = (value) => {
  if (!Array.isArray(value) || !value.length) return "—";
  return value.join(", ");
};

export const buildParticipantColumns = ({ fields = [] }) => {
  const nameField = fields.find(
    (field) => field?.fieldType === "participantName"
  );
  const emailField = fields.find(
    (field) => field?.fieldType === "participantEmail"
  );

  const columns = [
    {
      id: "name",
      label: "Name",
      order: 1,
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
      order: 2,
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
      id: "tier",
      label: "Tier",
      order: 3,
      show: true,
      enableSorting: true,
      orderBy: "tier",
      column: {
        id: "tier",
        header: () => "Tier",
        accessorFn: (row) => row?.tier?.name ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "period",
      label: "Period",
      order: 4,
      show: true,
      enableSorting: true,
      orderBy: "period",
      column: {
        id: "period",
        header: () => "Period",
        accessorFn: (row) =>
          row?.period?.name ?? row?.periodPricing?.name ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "team",
      label: "Team",
      order: 5,
      show: true,
      enableSorting: true,
      orderBy: "team",
      column: {
        id: "team",
        header: () => "Team",
        accessorFn: (row) => row?.team?.name ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "finalized",
      label: "Finalized",
      order: 6,
      show: true,
      enableSorting: true,
      orderBy: "finalized",
      column: {
        id: "finalized",
        header: () => "Finalized",
        accessorFn: (row) => Boolean(row?.finalized),
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge soft color="success">
              Finalized
            </Badge>
          ) : (
            <Badge soft color="secondary">
              Pending
            </Badge>
          ),
        size: 120,
      },
    },
    {
      id: "upsells",
      label: "Upsells",
      order: 7,
      show: true,
      enableSorting: false,
      column: {
        id: "upsells",
        header: () => "Upsells",
        accessorFn: (row) => row?.upsellSummary ?? [],
        cell: ({ getValue }) => formatList(getValue()),
      },
    },
    {
      id: "coupon",
      label: "Coupon",
      order: 8,
      show: false,
      enableSorting: false,
      column: {
        id: "coupon",
        header: () => "Coupon",
        accessorFn: (row) => row?.coupon?.code ?? null,
        cell: ({ getValue }) => getValue() || "—",
      },
    },
    {
      id: "priceSnapshot",
      label: "Price",
      order: 9,
      show: false,
      enableSorting: true,
      orderBy: "priceSnapshot",
      column: {
        id: "priceSnapshot",
        header: () => "Price",
        accessorFn: (row) => row?.priceSnapshot ?? null,
        cell: ({ getValue }) => formatCurrency(getValue()),
      },
    },
    {
      id: "createdAt",
      label: "Registered",
      order: 10,
      show: true,
      enableSorting: true,
      orderBy: "createdAt",
      column: {
        id: "createdAt",
        header: () => "Registered",
        accessorFn: (row) => row?.createdAt ?? null,
        cell: ({ getValue }) => formatDateTime(getValue()),
      },
    },
    {
      id: "updatedAt",
      label: "Updated",
      order: 11,
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
