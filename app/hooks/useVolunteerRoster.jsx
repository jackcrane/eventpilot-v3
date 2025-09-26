import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load volunteers");
    return res.json();
  });

const buildKey = ({
  eventId,
  page,
  size,
  orderBy,
  order,
  search,
  filters,
}) => {
  if (!eventId) return null;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (orderBy) params.set("orderBy", orderBy);
  if (order) params.set("order", order);
  if (search) params.set("q", search);
  if (filters) params.set("filters", filters);
  return `/api/events/${eventId}/volunteers?${params.toString()}`;
};

export const useVolunteerRoster = ({
  eventId,
  initialPageSize = 25,
  search = "",
  filters = [],
} = {}) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialPageSize);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const normalizedSearch = useMemo(() => {
    if (typeof search !== "string") return "";
    return search.trim();
  }, [search]);

  const serializedFilters = useMemo(() => {
    if (!Array.isArray(filters) || !filters.length) return "";
    try {
      return JSON.stringify(filters);
    } catch (error) {
      console.warn("Failed to serialize volunteer filters", error);
      return "";
    }
  }, [filters]);

  const key = useMemo(
    () =>
      buildKey({
        eventId,
        page,
        size,
        orderBy,
        order,
        search: normalizedSearch,
        filters: serializedFilters,
      }),
    [
      eventId,
      page,
      size,
      orderBy,
      order,
      normalizedSearch,
      serializedFilters,
    ]
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    keepPreviousData: true,
  });

  useEffect(() => {
    const meta = data?.meta;
    if (!meta) return;
    if (meta.orderBy && meta.orderBy !== orderBy) setOrderBy(meta.orderBy);
    if (meta.order && meta.order !== order) setOrder(meta.order);
  }, [data?.meta, orderBy, order]);

  const rows = data?.rows ?? [];
  const fields = data?.fields ?? [];
  const total = data?.meta?.total ?? 0;

  const setSorting = useCallback((nextOrderBy, nextOrder = "desc") => {
    setOrderBy(nextOrderBy || "createdAt");
    setOrder(nextOrder === "asc" ? "asc" : "desc");
  }, []);

  return {
    rows,
    fields,
    total,
    page,
    size,
    orderBy,
    order,
    loading: isLoading,
    validating: isValidating,
    error,
    setPage,
    setSize,
    setSorting,
    setOrderBy,
    setOrder,
    mutate,
  };
};
