import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load registrations");
    return res.json();
  });

const buildKey = ({ eventId, page, size, orderBy, order }) => {
  if (!eventId) return null;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (orderBy) params.set("orderBy", orderBy);
  if (order) params.set("order", order);
  return `/api/events/${eventId}/registration/registrations?${params.toString()}`;
};

export const useParticipantRoster = ({ eventId, initialPageSize = 25 } = {}) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialPageSize);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const key = useMemo(
    () => buildKey({ eventId, page, size, orderBy, order }),
    [eventId, page, size, orderBy, order]
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
