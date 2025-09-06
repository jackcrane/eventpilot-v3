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
let recorderStarted = false; // singleton guard across StrictMode/effect re-runs
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
    try {
      if (id) {
        // Store current session id for consumer flows to read when submitting
        // Use sessionStorage so it resets on tab close
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("ep_rrweb_sessionId", id);
        }
      }
    } catch (_) {
      // no-op if storage is unavailable
    }
  };

  const startedAtRef = useRef(null);
  const lastFlushAtRef = useRef(null);
  const stopFnRef = useRef(null);
  const intervalRef = useRef(null);

  // Keep latest props in refs so we can run the recorder lifecycle once
  const eventIdRef = useRef(eventId);
  const instanceIdRef = useRef(instanceId);
  const pageTypeRef = useRef(pageType);
  const pathPropRef = useRef(path);

  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);
  useEffect(() => {
    instanceIdRef.current = instanceId;
  }, [instanceId]);
  useEffect(() => {
    pageTypeRef.current = pageType;
  }, [pageType]);
  useEffect(() => {
    pathPropRef.current = path;
  }, [path]);

  const eventsRef = useRef([]); // active buffer
  const pendingRef = useRef([]); // queued before session id exists

  const creatingRef = useRef(false);
  const createdOnceRef = useRef(false);
  const finalizingRef = useRef(false);

  const buildPath = () =>
    pathPropRef.current ||
    (typeof location !== "undefined" ? location.pathname : undefined);

  const drainPending = async (sid) => {
    if (!sid || pendingRef.current.length === 0) return;
    const pending = pendingRef.current;
    pendingRef.current = [];
    for (const p of pending) {
      await postJson(`/api/events/${eventIdRef.current}/sessions/${sid}`, {
        chunk: {
          fileB64: p.fileB64,
          filename: `rrweb-${sid}-${p.startedAt}.json`,
          contentType: "application/json",
          startedAt: p.startedAt,
          endedAt: p.endedAt,
        },
        finalize: p.finalize,
        terminationReason: p.terminationReason,
        pageType: pageTypeRef.current,
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

    await postJson(`/api/events/${eventIdRef.current}/sessions/${sid}`, {
      chunk: {
        fileB64,
        filename: `rrweb-${sid}-${startedAt}.json`,
        contentType: "application/json",
        startedAt,
        endedAt,
      },
      finalize,
      terminationReason,
      pageType: pageTypeRef.current,
      path: buildPath(),
    });
  };

  const createSession = async () => {
    const eid = eventIdRef.current;
    if (creatingRef.current || createdOnceRef.current || !eid) return;
    creatingRef.current = true;
    try {
      const body = {
        instanceId: instanceIdRef.current || undefined,
        pageType: pageTypeRef.current || undefined,
        path: buildPath(),
        metadata: {
          startedAt: startedAtRef.current,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
      };
      const json = await postJson(`/api/events/${eid}/sessions`, body);
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
    // Ensure we only start recording/interval once per page lifetime
    if (!recorderStarted) {
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

      recorderStarted = true;
    }

    // lifecycle -> only finalize when the page is actually closing
    const onBeforeUnload = () => finalize("CLOSE");

    window.addEventListener("beforeunload", onBeforeUnload);

    // cleanup remover
    return () => {
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

  // Start once on mount and keep running; only end on page close
  useEffect(() => {
    let removeLifecycle = () => {};
    (async () => {
      removeLifecycle = await start();
    })();
    return () => {
      // Do not finalize on unmount; just remove our listeners
      removeLifecycle?.();
    };
    // We intentionally run once to avoid finalizing/restarting during normal renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessionId,
    flush: () => flush(),
    finalize,
    stop,
  };
};
