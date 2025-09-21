import { useEffect, useMemo, useState } from "react";
import { useCrmFilterDefinitions } from "./useCrmFilterDefinitions";

const getValue = (input) => {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "object" && "target" in input) {
    return input.target?.value ?? "";
  }
  return String(input ?? "");
};

export const useCrmManualFilters = ({
  crmFields = [],
  storedFilters,
  setStoredFilters,
}) => {
  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const filterFieldDefs = useCrmFilterDefinitions(crmFields);

  useEffect(() => {
    if (hydrated) return;
    if (!storedFilters?.manual) return;
    setSearch(storedFilters.manual.search || "");
    setHydrated(true);
  }, [storedFilters, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const minimal = (filters || []).map((filter) => ({
      label: filter?.field?.label,
      operation: filter?.operation,
      value: filter?.value ?? null,
    }));
    setStoredFilters((prev) => ({
      ...(prev || {}),
      manual: { search: search || "", filters: minimal },
    }));
  }, [filters, search, hydrated, setStoredFilters]);

  const serverFilters = useMemo(() => {
    if (!filters?.length) return [];
    const dynamicMap = new Map((crmFields || []).map((f) => [f.label, f.id]));
    return filters.map((filter) => {
      const label = filter?.field?.label;
      const fieldId = dynamicMap.get(label);
      const path = fieldId ? `fields.${fieldId}` : label;
      return { path, operation: filter?.operation, value: filter?.value ?? null };
    });
  }, [filters, crmFields]);

  const handleSearchChange = (value) => {
    setSearch(getValue(value));
  };

  const handleFiltersChange = (next) => {
    setFilters(next || []);
  };

  return {
    search,
    setSearch: handleSearchChange,
    filters,
    setFilters: handleFiltersChange,
    filterFieldDefs,
    serverFilters,
    initialFilters: storedFilters?.manual?.filters || [],
  };
};
