import { useEffect, useRef, useState } from "react";
import { u } from "../util/url";

/** Simple POST JSON helper (no keepalive) */
export const postJson = async (url, body) => {
  const res = await fetch(u(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${res.status} ${t}`);
  }
  return res.json();
};

/** Browser-safe base64 for UTF-8 strings */
const toBase64 = (str) =>
  typeof window === "undefined"
    ? Buffer.from(str, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(str)));

let rrwebRecordRef = null;
const ensureRrweb = async () => {
  if (!rrwebRecordRef) {
    const mod = await import("rrweb");
    rrwebRecordRef = mod.record;
  }
  return rrwebRecordRef;
};

/**
 * useRrWebRecorder
 * - Starts rrweb recording on mount
 * - Creates session via POST /api/events/:eventId/sessions
 * - Every `burstMs` uploads chunk to /api/events/:eventId/sessions/:sessionId
 * - Caches chunks until session is created, then drains
 * - Finalizes on UNLOAD/CLOSE without using keepalive
 */
export const useRrWebRecorder = ({
  eventId,
  instanceId, // optional
  pageType, // optional
  path, // optional
  burstMs = 5000,
} = {}) => {
  const [sessionId, _setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const setSessionId = (id) => {
    sessionIdRef.current = id;
    _setSessionId(id);
  };

  const startedAtRef = useRef(null);
  const lastFlushAtRef = useRef(null);
  const stopFnRef = useRef(null);
  const intervalRef = useRef(null);

  const eventsRef = useRef([]); // active buffer
  const pendingRef = useRef([]); // queued before session id exists

  const creatingRef = useRef(false);
  const createdOnceRef = useRef(false);
  const finalizingRef = useRef(false);

  const buildPath = () =>
    path || (typeof location !== "undefined" ? location.pathname : undefined);

  const drainPending = async (sid) => {
    if (!sid || pendingRef.current.length === 0) return;
    const pending = pendingRef.current;
    pendingRef.current = [];
    for (const p of pending) {
      await postJson(`/api/events/${eventId}/sessions/${sid}`, {
        chunk: {
          fileB64: p.fileB64,
          filename: `rrweb-${sid}-${p.startedAt}.json`,
          contentType: "application/json",
          startedAt: p.startedAt,
          endedAt: p.endedAt,
        },
        finalize: p.finalize,
        terminationReason: p.terminationReason,
        pageType,
        path: buildPath(),
      });
    }
  };

  const flush = async ({ finalize = false, terminationReason = null } = {}) => {
    if (finalizingRef.current) return;
    if (eventsRef.current.length === 0 && !finalize) return;

    // snapshot & clear buffer
    const snapshot = eventsRef.current;
    eventsRef.current = [];

    const startedAt =
      lastFlushAtRef.current ?? startedAtRef.current ?? Date.now();
    const endedAt = Date.now();
    lastFlushAtRef.current = endedAt;

    const json = JSON.stringify({
      startedAt,
      endedAt,
      count: snapshot.length,
      events: snapshot,
      meta: {
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        path: buildPath(),
        pageType: pageType || undefined,
      },
    });
    const fileB64 = toBase64(json);

    const sid = sessionIdRef.current;
    if (!sid) {
      pendingRef.current.push({
        fileB64,
        startedAt,
        endedAt,
        finalize,
        terminationReason,
      });
      return;
    }

    await postJson(`/api/events/${eventId}/sessions/${sid}`, {
      chunk: {
        fileB64,
        filename: `rrweb-${sid}-${startedAt}.json`,
        contentType: "application/json",
        startedAt,
        endedAt,
      },
      finalize,
      terminationReason,
      pageType,
      path: buildPath(),
    });
  };

  const createSession = async () => {
    if (creatingRef.current || createdOnceRef.current || !eventId) return;
    creatingRef.current = true;
    try {
      const body = {
        instanceId: instanceId || undefined,
        pageType: pageType || undefined,
        path: buildPath(),
        metadata: {
          startedAt: startedAtRef.current,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
      };
      const json = await postJson(`/api/events/${eventId}/sessions`, body);
      if (json?.id) {
        setSessionId(json.id);
        createdOnceRef.current = true;
        await drainPending(json.id);
      }
    } catch {
      // swallow; next tick/flush will retry while sessionIdRef is null
    } finally {
      creatingRef.current = false;
    }
  };

  const start = async () => {
    const record = await ensureRrweb();
    startedAtRef.current = Date.now();

    stopFnRef.current = record({
      emit: (e) => {
        eventsRef.current.push(e);
      },
      // sampling / recordCanvas can be configured here
    });

    // attempt session create ASAP
    createSession();

    // interval that never closes over stale state
    intervalRef.current = setInterval(() => {
      flush().catch(() => {});
      if (!sessionIdRef.current && !creatingRef.current) {
        createSession();
      }
    }, burstMs);

    // lifecycle -> finalize
    const onPageHide = () => finalize("UNLOAD");
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") finalize("UNLOAD");
    };
    const onBeforeUnload = () => finalize("CLOSE");

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    // cleanup remover
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  };

  const stop = async () => {
    if (stopFnRef.current) {
      stopFnRef.current();
      stopFnRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const finalize = async (reason /* "UNLOAD" | "CLOSE" */) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    try {
      if (stopFnRef.current) {
        stopFnRef.current();
        stopFnRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      await flush({ finalize: true, terminationReason: reason });
      await drainPending(sessionIdRef.current);
    } finally {
      finalizingRef.current = false;
    }
  };

  useEffect(() => {
    if (!eventId) return;
    let removeLifecycle = () => {};
    (async () => {
      removeLifecycle = await start();
    })();
    return () => {
      // treat React unmount as a proper close
      finalize("CLOSE").catch(() => {});
      removeLifecycle?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, burstMs, pageType, path, instanceId]);

  return {
    sessionId,
    flush: () => flush(),
    finalize,
    stop,
  };
};
