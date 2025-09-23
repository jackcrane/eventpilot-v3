import { useEffect, useMemo, useRef, useState } from "react";
import { useCrmFilterDefinitions } from "./useCrmFilterDefinitions";

const getValue = (input) => {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "object" && "target" in input) {
    return input.target?.value ?? "";
  }
  return String(input ?? "");
};

const DEFAULT_MANUAL_STATE = { search: "", filters: [] };

const normalizeManualState = (manual) => {
  if (!manual) return { search: "", filters: [] };
  const filters = Array.isArray(manual.filters) ? manual.filters : [];
  return {
    search: typeof manual.search === "string" ? manual.search : String(manual.search ?? ""),
    filters: filters.map((filter) => ({
      label: filter?.label ?? "",
      operation: filter?.operation ?? null,
      value: filter?.value ?? null,
    })),
  };
};

const isObject = (value) => value !== null && typeof value === "object";

const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  if (isObject(a) && isObject(b)) {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date || b instanceof Date) {
      return false;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
};

export const useCrmManualFilters = ({
  crmFields = [],
  storedFilters,
  setStoredFilters,
}) => {
  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const lastSavedManualRef = useRef(DEFAULT_MANUAL_STATE);

  const filterFieldDefs = useCrmFilterDefinitions(crmFields);

  useEffect(() => {
    if (hydrated) return;
    if (!storedFilters?.manual) return;
    setSearch(storedFilters.manual.search || "");
    lastSavedManualRef.current = normalizeManualState(storedFilters.manual);
    setHydrated(true);
  }, [storedFilters, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const minimal = (filters || []).map((filter) => ({
      label: filter?.field?.label,
      operation: filter?.operation,
      value: filter?.value ?? null,
    }));
    const currentManual = normalizeManualState({
      search,
      filters: minimal,
    });

    if (deepEqual(currentManual, lastSavedManualRef.current)) return;

    lastSavedManualRef.current = currentManual;
    setStoredFilters((prev) => ({
      ...(prev || {}),
      manual: currentManual,
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
