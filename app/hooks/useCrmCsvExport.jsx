import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";
import { filterPersons } from "../util/crm/filterPersons";
import { getCrmValueByAccessor } from "./useCrmTableSorting";
import { getCrmDataRequirements } from "../util/crm/getCrmDataRequirements";

const arrayToString = (value) => {
  if (!Array.isArray(value)) return value == null ? "" : String(value);
  return value
    .map((entry) => {
      if (entry == null) return "";
      if (typeof entry === "string") return entry;
      if (typeof entry === "number" || typeof entry === "boolean")
        return String(entry);
      if (typeof entry === "object") {
        if (typeof entry.email === "string") return entry.email;
        if (typeof entry.phone === "string") return entry.phone;
        if (typeof entry.label === "string" && typeof entry.value === "string")
          return `${entry.label}: ${entry.value}`;
        if (typeof entry.name === "string") return entry.name;
        if (typeof entry.title === "string") return entry.title;
        if (typeof entry.code === "string") return entry.code;
      }
      try {
        return JSON.stringify(entry);
      } catch (_) {
        return String(entry);
      }
    })
    .filter((part) => part && part.trim().length)
    .join("; ");
};

const formatColumnValue = (column, row) => {
  if (!column) return "";
  if (typeof column.csvAccessor === "function") {
    return arrayToString(column.csvAccessor(row));
  }

  let raw;
  if (typeof column.accessor === "function") {
    raw = column.accessor(row);
  } else if (typeof column.accessor === "string" && column.accessor.trim()) {
    raw = getCrmValueByAccessor(row ?? {}, column.accessor);
  } else {
    raw = null;
  }

  const id = column.id || column.accessor;
  if (id === "emails") {
    return arrayToString((row?.emails || []).map((email) => email.email).filter(Boolean));
  }
  if (id === "phones") {
    return arrayToString((row?.phones || []).map((phone) => phone.phone).filter(Boolean));
  }
  if (id === "lifetimeValue") {
    const amount = Number(raw ?? 0);
    return Number.isFinite(amount) ? amount.toFixed(2) : "";
  }
  if (id === "emailOpenRate") {
    const stats = row?.emailStats;
    if (!stats || !Number.isFinite(stats.sent) || stats.sent <= 0) return "";
    const percent = Math.round(((stats.opened || 0) / stats.sent) * 100);
    return `${percent}% (${stats.opened || 0}/${stats.sent})`;
  }
  if (id === "createdAt" || id === "updatedAt" || id === "lastEmailedAt") {
    if (!raw) return "";
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  if (
    id === "registrationPeriod" ||
    id === "registrationTier" ||
    id === "registrationTeam" ||
    id === "registrationCoupon" ||
    id === "registrationUpsells" ||
    id === "volunteerLocations" ||
    id === "volunteerJobs"
  ) {
    return arrayToString(raw || []);
  }

  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (raw instanceof Date) return raw.toISOString();
  if (Array.isArray(raw)) return arrayToString(raw);
  if (raw && typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch (_) {
      return "";
    }
  }
  return raw == null ? "" : String(raw);
};

const escapeCsv = (value) => {
  const str = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
};

const buildCsv = (columns, rows) => {
  const header = columns.map((column) => escapeCsv(column.label || column.id || ""));
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsv(formatColumnValue(column, row))).join(",")
  );
  return [header.join(","), ...lines].join("\n");
};

const triggerDownload = (content, filename) => {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const timestampedFilename = (eventId) => {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:T]/g, "-").split(".")[0];
  return `crm-contacts-${eventId}-${stamp}.csv`;
};

export const useCrmCsvExport = ({
  eventId,
  search,
  serverFilters,
  clientFilters,
  orderBy,
  order,
  aiState,
}) => {
  const [downloading, setDownloading] = useState(false);

  const fetchManualData = useCallback(async ({ include } = {}) => {
    if (!eventId) return [];
    const baseKey = `/api/events/${eventId}/crm/person`;
    const params = new URLSearchParams();
    if (orderBy) params.set("orderBy", orderBy);
    if (order) params.set("order", order);
    if (search && search.trim()) params.set("q", search.trim());
    if (Array.isArray(serverFilters) && serverFilters.length) {
      params.set("filters", JSON.stringify(serverFilters));
    }
    if (Array.isArray(include) && include.length) {
      params.set("include", include.join(","));
    }
    const key = params.toString() ? `${baseKey}?${params.toString()}` : baseKey;
    const res = await authFetch(key);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = json?.message || json?.error || res.statusText || "Failed to load contacts";
      throw new Error(message);
    }
    return Array.isArray(json?.crmPersons) ? json.crmPersons : [];
  }, [eventId, orderBy, order, search, serverFilters]);

  const fetchAiData = useCallback(async () => {
    if (!eventId) return [];
    const filterAst = aiState?.lastAst?.filter || aiState?.lastAst;
    if (!filterAst) {
      throw new Error("Missing AI segment details. Re-run the AI segment and try again.");
    }
    const body = {
      filter: filterAst,
      debug: !!aiState?.lastAst?.debug,
      pagination: {
        orderBy: orderBy || undefined,
        order: order || undefined,
      },
    };
    const res = await authFetch(`/api/events/${eventId}/crm/segments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = json?.message || json?.error || res.statusText || "Failed to load AI segment";
      throw new Error(message);
    }
    return Array.isArray(json?.crmPersons) ? json.crmPersons : [];
  }, [eventId, aiState, orderBy, order]);

  const downloadCsv = useCallback(
    async ({ columns }) => {
      if (!eventId) {
        toast.error("Event context is missing.");
        return;
      }
      if (!Array.isArray(columns) || columns.length === 0) {
        toast.error("Select at least one column before exporting.");
        return;
      }
      if (downloading) return;

      setDownloading(true);
      try {
        await toast.promise(
          (async () => {
            const include = getCrmDataRequirements(columns);
            const data = aiState?.usingAi
              ? await fetchAiData()
              : await fetchManualData({ include });
            const filtered = filterPersons({
              persons: data,
              filters: clientFilters,
              search,
            });
            const csv = buildCsv(columns, filtered);
            triggerDownload(csv, timestampedFilename(eventId));
            return filtered.length;
          })(),
          {
            loading: "Preparing CSV...",
            success: (count) =>
              count === 1
                ? "Downloaded 1 contact."
                : `Downloaded ${count} contacts.`,
            error: (error) => error.message || "Failed to download CSV.",
          }
        );
      } finally {
        setDownloading(false);
      }
    },
    [
      eventId,
      aiState,
      fetchAiData,
      fetchManualData,
      clientFilters,
      search,
      downloading,
    ]
  );

  return { downloadCsv, downloading };
};
