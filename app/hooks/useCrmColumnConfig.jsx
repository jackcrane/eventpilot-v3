import { useEffect, useMemo, useState } from "react";
import { createBaseColumns, buildDynamicColumn } from "../util/crm/createColumns";

export const useCrmColumnConfig = ({ crmFields = [], onViewPerson }) => {
  const [columnConfig, setColumnConfig] = useState(
    createBaseColumns(onViewPerson)
  );

  useEffect(() => {
    if (!crmFields?.length) return;
    setColumnConfig((current) => {
      if (current.some((column) => column.id.startsWith("field-"))) return current;
      const idx = current.findIndex((column) => column.id === "phones");
      const dynamic = crmFields.map((field) => buildDynamicColumn(field));
      return [
        ...current.slice(0, idx + 1),
        ...dynamic,
        ...current.slice(idx + 1),
      ].map((column, index) => ({ ...column, order: index + 1 }));
    });
  }, [crmFields]);

  const visibleColumns = useMemo(
    () =>
      columnConfig
        .filter((column) => column.show)
        .sort((a, b) => a.order - b.order)
        .map(({ show, order, ...rest }) => rest),
    [columnConfig]
  );

  return { columnConfig, setColumnConfig, visibleColumns };
};
