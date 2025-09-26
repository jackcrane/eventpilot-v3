import { useMemo } from "react";

export const useVolunteerFilterDefinitions = ({ fields = [] } = {}) => {
  return useMemo(() => {
    const baseDefinitions = [
      {
        label: "createdAt",
        hrTitle: "Submitted Date",
        type: "date",
        defaultOperation: "date-after",
        accessor: (row) => row?.createdAt,
        path: "createdAt",
      },
      {
        label: "updatedAt",
        hrTitle: "Updated Date",
        type: "date",
        defaultOperation: "date-after",
        accessor: (row) => row?.updatedAt,
        path: "updatedAt",
      },
    ];

    const sortedFields = [...(fields || [])].sort((a, b) => {
      const orderA = Number.isFinite(a?.order) ? a.order : 0;
      const orderB = Number.isFinite(b?.order) ? b.order : 0;
      return orderA - orderB;
    });

    const dynamic = sortedFields.map((field) => ({
      label: `field-${field.id}`,
      hrTitle: field.label || "Field",
      type: "text",
      defaultOperation: "contains",
      accessor: (row) => row?.fieldDisplay?.[field.id],
      path: `field:${field.id}`,
    }));

    return [...baseDefinitions, ...dynamic];
  }, [fields]);
};
